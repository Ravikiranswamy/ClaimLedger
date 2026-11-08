package com.claimledger.engine;

import com.claimledger.model.KnowledgeDocument;
import com.claimledger.model.enums.ApprovalStatus;
import com.claimledger.model.enums.AuthorityTier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * DETERMINISTIC Pure Java Authority Resolution Engine for ClaimLedger.
 * Decides which document is authoritative and resolves claim verification status.
 *
 * Rules:
 * 1. Filter out documents with status: DRAFT, REJECTED, EXPIRED, WITHDRAWN, SUPERSEDED
 * 2. Check effective_date <= today <= expiry_date
 * 3. Match document scope: department, product_scope, region, channel
 * 4. Apply authority_tier ranking: TIER_1 > TIER_2 > TIER_3
 * 5. Select highest applicable version among same-tier docs
 * 6. If two TIER_1 active scoped docs disagree on a numeric fact -> mark claim as CONFLICT
 */
@Component
public class AuthorityResolutionEngine {

    private static final Logger log = LoggerFactory.getLogger(AuthorityResolutionEngine.class);
    private final VersionComparator versionComparator = new VersionComparator();

    public record DocumentEvidenceCandidate(
            KnowledgeDocument document,
            String excerpt,
            Double relevanceScore
    ) {}

    public record ResolutionScopeContext(
            UUID departmentId,
            String productScope,
            String region,
            String channel,
            LocalDate evaluationDate
    ) {}

    /**
     * Executes the deterministic 6-step Authority Resolution algorithm.
     */
    public AuthorityResolutionResult resolveAuthority(
            String claimText,
            List<DocumentEvidenceCandidate> candidates,
            ResolutionScopeContext scopeContext
    ) {
        if (candidates == null || candidates.isEmpty()) {
            return AuthorityResolutionResult.unverified("No knowledge base evidence retrieved for this claim.");
        }

        LocalDate today = (scopeContext != null && scopeContext.evaluationDate() != null)
                ? scopeContext.evaluationDate()
                : LocalDate.now();

        log.debug("Step 1 & 2: Filtering documents by active APPROVED status and date validity (today: {})", today);
        // Step 1: Filter out DRAFT, REJECTED, EXPIRED, WITHDRAWN, SUPERSEDED
        // Step 2: Check effective_date <= today <= expiry_date
        List<DocumentEvidenceCandidate> activeValidCandidates = candidates.stream()
                .filter(c -> c.document() != null)
                .filter(c -> c.document().getApprovalStatus() == ApprovalStatus.APPROVED)
                .filter(c -> isDateValid(c.document(), today))
                .toList();

        if (activeValidCandidates.isEmpty()) {
            return AuthorityResolutionResult.unverified(
                    "All retrieved documents are inactive, superseded, expired, or pending approval."
            );
        }

        // Step 3: Match document scope: department, product_scope, region, channel
        log.debug("Step 3: Matching document scope with context: {}", scopeContext);
        List<DocumentEvidenceCandidate> scopedCandidates = activeValidCandidates.stream()
                .filter(c -> matchesScope(c.document(), claimText, scopeContext))
                .toList();

        // If no strict scope match found, but we had active valid docs, check if org-wide fallback applies
        if (scopedCandidates.isEmpty()) {
            scopedCandidates = activeValidCandidates.stream()
                    .filter(c -> isOrgWide(c.document()))
                    .toList();
        }

        if (scopedCandidates.isEmpty()) {
            return AuthorityResolutionResult.unverified(
                    "No active approved documents match the specified department, product, region, or channel scope."
            );
        }

        // Step 4: Apply authority_tier ranking: TIER_1 > TIER_2 > TIER_3
        log.debug("Step 4: Applying authority tier ranking");
        List<DocumentEvidenceCandidate> tier1Candidates = scopedCandidates.stream()
                .filter(c -> c.document().getAuthorityTier() == AuthorityTier.TIER_1)
                .toList();

        List<DocumentEvidenceCandidate> tier2Candidates = scopedCandidates.stream()
                .filter(c -> c.document().getAuthorityTier() == AuthorityTier.TIER_2)
                .toList();

        List<DocumentEvidenceCandidate> tier3Candidates = scopedCandidates.stream()
                .filter(c -> c.document().getAuthorityTier() == AuthorityTier.TIER_3)
                .toList();

        List<DocumentEvidenceCandidate> highestTierCandidates;
        AuthorityTier winningTier;

        if (!tier1Candidates.isEmpty()) {
            highestTierCandidates = tier1Candidates;
            winningTier = AuthorityTier.TIER_1;
        } else if (!tier2Candidates.isEmpty()) {
            highestTierCandidates = tier2Candidates;
            winningTier = AuthorityTier.TIER_2;
        } else if (!tier3Candidates.isEmpty()) {
            highestTierCandidates = tier3Candidates;
            winningTier = AuthorityTier.TIER_3;
        } else {
            return AuthorityResolutionResult.unverified("No candidates available after tier ranking.");
        }

        // Step 5: Select highest applicable version among same-tier docs
        log.debug("Step 5: Selecting highest version for tier {}", winningTier);
        String highestVersion = highestTierCandidates.stream()
                .map(c -> c.document().getVersion())
                .filter(Objects::nonNull)
                .max(versionComparator)
                .orElse("v1.0");

        List<DocumentEvidenceCandidate> highestVersionCandidates = highestTierCandidates.stream()
                .filter(c -> versionComparator.compare(c.document().getVersion(), highestVersion) == 0)
                .toList();

        // Step 6: Conflict Detection
        // If two TIER_1 active scoped docs disagree on a numeric fact -> mark claim as CONFLICT (escalate to human)
        if (winningTier == AuthorityTier.TIER_1) {
            // Check all active scoped TIER_1 docs for numeric disagreements
            for (int i = 0; i < tier1Candidates.size(); i++) {
                for (int j = i + 1; j < tier1Candidates.size(); j++) {
                    DocumentEvidenceCandidate candA = tier1Candidates.get(i);
                    DocumentEvidenceCandidate candB = tier1Candidates.get(j);

                    if (!candA.document().getId().equals(candB.document().getId())) {
                        if (NumericFactExtractor.hasNumericConflict(candA.excerpt(), candB.excerpt())) {
                            String details = String.format("Conflicting numeric facts between '%s' (%s) and '%s' (%s)",
                                    candA.document().getName(), candA.document().getVersion(),
                                    candB.document().getName(), candB.document().getVersion());
                            log.warn("Step 6: CONFLICT detected: {}", details);
                            return AuthorityResolutionResult.conflict(details, List.of(candA.document(), candB.document()));
                        }
                    }
                }
            }
        }

        // Choose the primary authoritative document (highest version, highest relevance score)
        DocumentEvidenceCandidate authoritativeCandidate = highestVersionCandidates.stream()
                .max(Comparator.comparing(c -> c.relevanceScore() != null ? c.relevanceScore() : 0.0))
                .orElse(highestVersionCandidates.get(0));

        KnowledgeDocument authoritativeDoc = authoritativeCandidate.document();
        String authoritativeExcerpt = authoritativeCandidate.excerpt() != null ? authoritativeCandidate.excerpt() : "";

        // Check if claim contradicts authoritative evidence (Numeric / Factual violation)
        Optional<String> mismatch = NumericFactExtractor.findMismatch(claimText, authoritativeExcerpt);
        if (mismatch.isPresent()) {
            String explanation = String.format(
                    "Violation detected against authoritative %s document '%s' (%s): %s",
                    authoritativeDoc.getAuthorityTier(), authoritativeDoc.getName(), authoritativeDoc.getVersion(), mismatch.get()
            );
            String suggestedCorrection = String.format(
                    "Align claim with %s (%s). Excerpt: \"%s\"",
                    authoritativeDoc.getName(), authoritativeDoc.getVersion(),
                    authoritativeExcerpt.length() > 150 ? authoritativeExcerpt.substring(0, 150) + "..." : authoritativeExcerpt
            );
            log.info("Step 6: VIOLATION resolved: {}", explanation);
            return AuthorityResolutionResult.violation(authoritativeDoc, explanation, suggestedCorrection);
        }

        // Claim is verified by authoritative source
        String explanation = String.format(
                "Claim verified against authoritative %s document '%s' (Version %s, Scope: %s).",
                authoritativeDoc.getAuthorityTier(), authoritativeDoc.getName(), authoritativeDoc.getVersion(),
                authoritativeDoc.getProductScope() != null ? authoritativeDoc.getProductScope() : "Global"
        );
        log.info("Step 6: VERIFIED resolved against {}", authoritativeDoc.getName());
        return AuthorityResolutionResult.verified(authoritativeDoc, explanation);
    }

    private boolean isDateValid(KnowledgeDocument doc, LocalDate today) {
        if (doc.getEffectiveDate() != null && doc.getEffectiveDate().isAfter(today)) {
            return false;
        }
        if (doc.getExpiryDate() != null && doc.getExpiryDate().isBefore(today)) {
            return false;
        }
        return true;
    }

    private boolean matchesScope(KnowledgeDocument doc, String claimText, ResolutionScopeContext context) {
        if (context == null) {
            return true;
        }

        // Department check:
        // A department-specific document applies to its own department, OR to any claim that references
        // its authoritative product scope (e.g. Sales owns the Product Master Catalogue, but Marketing must adhere to its pricing)
        if (doc.getDepartmentId() != null && context.departmentId() != null) {
            boolean deptMatches = doc.getDepartmentId().equals(context.departmentId());
            boolean productMatches = doc.getProductScope() != null && !doc.getProductScope().isBlank() &&
                    claimText != null && claimText.toLowerCase().contains(doc.getProductScope().toLowerCase());

            if (!deptMatches && !productMatches) {
                return false;
            }
        }

        // Product scope check
        if (doc.getProductScope() != null && !doc.getProductScope().isBlank() && !doc.getProductScope().equalsIgnoreCase("ALL")) {
            String docScope = doc.getProductScope().trim();
            boolean contextMatches = context.productScope() != null &&
                    context.productScope().toLowerCase().contains(docScope.toLowerCase());
            boolean claimMatches = claimText != null &&
                    claimText.toLowerCase().contains(docScope.toLowerCase());

            if (!contextMatches && !claimMatches) {
                return false;
            }
        }

        // Region check
        if (doc.getRegion() != null && !doc.getRegion().isBlank() &&
                !doc.getRegion().equalsIgnoreCase("GLOBAL") && !doc.getRegion().equalsIgnoreCase("ALL")) {
            if (context.region() != null && !context.region().equalsIgnoreCase("GLOBAL")) {
                if (!doc.getRegion().equalsIgnoreCase(context.region())) {
                    return false;
                }
            }
        }

        // Channel check
        if (doc.getChannel() != null && !doc.getChannel().isBlank() && !doc.getChannel().equalsIgnoreCase("ALL")) {
            if (context.channel() != null && !context.channel().equalsIgnoreCase("ALL")) {
                if (!doc.getChannel().equalsIgnoreCase(context.channel())) {
                    return false;
                }
            }
        }

        return true;
    }

    private boolean isOrgWide(KnowledgeDocument doc) {
        return doc.getDepartmentId() == null &&
                (doc.getProductScope() == null || doc.getProductScope().equalsIgnoreCase("ALL")) &&
                (doc.getRegion() == null || doc.getRegion().equalsIgnoreCase("GLOBAL") || doc.getRegion().equalsIgnoreCase("ALL"));
    }
}
