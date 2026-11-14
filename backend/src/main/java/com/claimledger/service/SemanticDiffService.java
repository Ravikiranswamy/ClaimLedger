package com.claimledger.service;

import com.claimledger.dto.diff.ClaimAttributeDiff;
import com.claimledger.dto.diff.ClaimAttributes;
import com.claimledger.dto.diff.SemanticDiffResponse;
import com.claimledger.dto.diff.TextDiffChunk;
import com.claimledger.exception.BadRequestException;
import com.claimledger.exception.ResourceNotFoundException;
import com.claimledger.model.Claim;
import com.claimledger.model.SubmissionRevision;
import com.claimledger.repository.ClaimRepository;
import com.claimledger.repository.SubmissionRevisionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class SemanticDiffService {

    private static final Logger log = LoggerFactory.getLogger(SemanticDiffService.class);

    private final SubmissionRevisionRepository submissionRevisionRepository;
    private final ClaimRepository claimRepository;
    private final ClaimAttributeExtractionService attributeExtractionService;
    private final ObjectMapper objectMapper;

    public SemanticDiffService(
            SubmissionRevisionRepository submissionRevisionRepository,
            ClaimRepository claimRepository,
            ClaimAttributeExtractionService attributeExtractionService,
            ObjectMapper objectMapper
    ) {
        this.submissionRevisionRepository = submissionRevisionRepository;
        this.claimRepository = claimRepository;
        this.attributeExtractionService = attributeExtractionService;
        this.objectMapper = objectMapper;
    }

    /**
     * Computes two-layer semantic diff between two revisions:
     * Layer 1: Word-level text diff (added/removed/unchanged tokens)
     * Layer 2: Claim attribute diff (product, price, SLA, billing period, reverification flags)
     */
    @Transactional(readOnly = true)
    public SemanticDiffResponse computeDiff(UUID submissionId, int fromRevNum, int toRevNum) {
        if (fromRevNum == toRevNum) {
            throw new BadRequestException("From-revision and To-revision must be different for a diff comparison.");
        }

        SubmissionRevision fromRev = submissionRevisionRepository.findBySubmissionIdAndRevisionNumber(submissionId, fromRevNum)
                .orElseThrow(() -> new ResourceNotFoundException("Revision #" + fromRevNum + " not found for submission: " + submissionId));

        SubmissionRevision toRev = submissionRevisionRepository.findBySubmissionIdAndRevisionNumber(submissionId, toRevNum)
                .orElseThrow(() -> new ResourceNotFoundException("Revision #" + toRevNum + " not found for submission: " + submissionId));

        SemanticDiffResponse response = new SemanticDiffResponse();
        response.setSubmissionId(submissionId);
        response.setFromRevision(fromRevNum);
        response.setToRevision(toRevNum);
        response.setFromContent(fromRev.getContent() != null ? fromRev.getContent() : "");
        response.setToContent(toRev.getContent() != null ? toRev.getContent() : "");
        response.setFromCreatorNotes(fromRev.getCreatorNotes());
        response.setToCreatorNotes(toRev.getCreatorNotes());

        // 1. Layer 1: Text-level token diff
        List<TextDiffChunk> textDiff = computeTextDiff(response.getFromContent(), response.getToContent());
        response.setTextDiff(textDiff);

        // 2. Layer 2: Claim-level attribute diff
        List<Claim> fromClaims = claimRepository.findBySubmissionIdAndRevisionNumber(submissionId, fromRevNum);
        List<Claim> toClaims = claimRepository.findBySubmissionIdAndRevisionNumber(submissionId, toRevNum);

        List<ClaimAttributeDiff> claimDiffs = computeClaimAttributeDiffs(fromClaims, toClaims);
        response.setClaimDiffs(claimDiffs);

        int totalChanged = (int) claimDiffs.stream()
                .filter(d -> !"UNCHANGED".equals(d.getChangeType()))
                .count();
        boolean reverify = claimDiffs.stream().anyMatch(ClaimAttributeDiff::isReverificationRequired);

        response.setTotalClaimsChanged(totalChanged);
        response.setReverificationRequired(reverify);

        if (totalChanged == 0) {
            response.setDiffSummary("No substantive claim or attribute changes detected between Revision #" + fromRevNum + " and #" + toRevNum + ".");
        } else {
            response.setDiffSummary(String.format(
                    "Detected %d claim change(s) between Revision #%d and #%d. %s",
                    totalChanged, fromRevNum, toRevNum,
                    reverify ? "Re-verification required due to factual/pricing attribute modification." : "Wording updated; core facts preserved."
            ));
        }

        return response;
    }

    /**
     * LCS-based word tokenizer text diff algorithm.
     */
    public List<TextDiffChunk> computeTextDiff(String oldText, String newText) {
        if (oldText == null) oldText = "";
        if (newText == null) newText = "";

        if (oldText.equals(newText)) {
            return List.of(new TextDiffChunk(TextDiffChunk.DiffType.UNCHANGED, oldText));
        }

        String[] oldWords = oldText.split("(?<=\\s+)|(?=\\s+)");
        String[] newWords = newText.split("(?<=\\s+)|(?=\\s+)");

        int m = oldWords.length;
        int n = newWords.length;
        int[][] dp = new int[m + 1][n + 1];

        for (int i = m - 1; i >= 0; i--) {
            for (int j = n - 1; j >= 0; j--) {
                if (oldWords[i].equals(newWords[j])) {
                    dp[i][j] = dp[i + 1][j + 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
                }
            }
        }

        List<TextDiffChunk> chunks = new ArrayList<>();
        int i = 0, j = 0;
        while (i < m && j < n) {
            if (oldWords[i].equals(newWords[j])) {
                chunks.add(new TextDiffChunk(TextDiffChunk.DiffType.UNCHANGED, oldWords[i]));
                i++;
                j++;
            } else if (dp[i + 1][j] >= dp[i][j + 1]) {
                chunks.add(new TextDiffChunk(TextDiffChunk.DiffType.REMOVED, oldWords[i]));
                i++;
            } else {
                chunks.add(new TextDiffChunk(TextDiffChunk.DiffType.ADDED, newWords[j]));
                j++;
            }
        }
        while (i < m) {
            chunks.add(new TextDiffChunk(TextDiffChunk.DiffType.REMOVED, oldWords[i++]));
        }
        while (j < n) {
            chunks.add(new TextDiffChunk(TextDiffChunk.DiffType.ADDED, newWords[j++]));
        }

        // Consolidate consecutive chunks of same DiffType
        List<TextDiffChunk> consolidated = new ArrayList<>();
        for (TextDiffChunk c : chunks) {
            if (consolidated.isEmpty()) {
                consolidated.add(new TextDiffChunk(c.getType(), c.getText()));
            } else {
                TextDiffChunk last = consolidated.get(consolidated.size() - 1);
                if (last.getType() == c.getType()) {
                    last.setText(last.getText() + c.getText());
                } else {
                    consolidated.add(new TextDiffChunk(c.getType(), c.getText()));
                }
            }
        }

        return consolidated;
    }

    private List<ClaimAttributeDiff> computeClaimAttributeDiffs(List<Claim> fromClaims, List<Claim> toClaims) {
        List<ClaimAttributeDiff> diffs = new ArrayList<>();
        Set<UUID> matchedToClaimIds = new HashSet<>();

        for (Claim from : fromClaims) {
            ClaimAttributes fromAttr = resolveAttributes(from);

            // Find best matching claim in toClaims by attributeType and product
            Optional<Claim> matchedTo = toClaims.stream()
                    .filter(t -> !matchedToClaimIds.contains(t.getId()))
                    .filter(t -> {
                        ClaimAttributes toAttr = resolveAttributes(t);
                        return Objects.equals(fromAttr.getAttributeType(), toAttr.getAttributeType())
                                && (Objects.equals(fromAttr.getProduct(), toAttr.getProduct()) || fromAttr.getProduct() == null || toAttr.getProduct() == null);
                    })
                    .findFirst();

            if (matchedTo.isPresent()) {
                Claim to = matchedTo.get();
                matchedToClaimIds.add(to.getId());
                ClaimAttributes toAttr = resolveAttributes(to);

                boolean valueChanged = !Objects.equals(fromAttr.getValue(), toAttr.getValue());
                boolean periodChanged = !Objects.equals(fromAttr.getBillingPeriod(), toAttr.getBillingPeriod());
                boolean statusChanged = from.getVerificationStatus() != to.getVerificationStatus();

                boolean isModified = valueChanged || periodChanged || statusChanged || !Objects.equals(from.getClaimText(), to.getClaimText());

                String changeType = isModified ? "MODIFIED" : "UNCHANGED";
                boolean reverify = valueChanged || periodChanged;
                String severity = ("PRICE".equals(fromAttr.getAttributeType()) && valueChanged) ? "HIGH"
                        : (valueChanged ? "MEDIUM" : "LOW");

                String summary;
                if (valueChanged) {
                    summary = String.format("%s changed from %s to %s for %s (%s)",
                            fromAttr.getAttributeName(),
                            fromAttr.getValue(),
                            toAttr.getValue(),
                            toAttr.getProduct(),
                            toAttr.getBillingPeriod() != null ? toAttr.getBillingPeriod() : "Standard");
                } else if (isModified) {
                    summary = String.format("%s text revised; core value %s preserved.", fromAttr.getAttributeName(), toAttr.getValue());
                } else {
                    summary = String.format("%s retained unchanged (%s).", fromAttr.getAttributeName(), toAttr.getValue());
                }

                diffs.add(new ClaimAttributeDiff(
                        toAttr.getProduct(),
                        toAttr.getAttributeType(),
                        toAttr.getAttributeName(),
                        fromAttr.getValue(),
                        toAttr.getValue(),
                        toAttr.getUnit() != null ? toAttr.getUnit() : fromAttr.getUnit(),
                        toAttr.getBillingPeriod() != null ? toAttr.getBillingPeriod() : fromAttr.getBillingPeriod(),
                        changeType,
                        reverify,
                        severity,
                        summary,
                        from.getVerificationStatus().name(),
                        to.getVerificationStatus().name()
                ));
            } else {
                // Claim was removed in toRevision
                diffs.add(new ClaimAttributeDiff(
                        fromAttr.getProduct(),
                        fromAttr.getAttributeType(),
                        fromAttr.getAttributeName(),
                        fromAttr.getValue(),
                        null,
                        fromAttr.getUnit(),
                        fromAttr.getBillingPeriod(),
                        "REMOVED",
                        true,
                        "MEDIUM",
                        "Claim removed in revision: " + from.getClaimText(),
                        from.getVerificationStatus().name(),
                        null
                ));
            }
        }

        // Check for any newly added claims in toRevision that had no counterpart in fromRevision
        for (Claim to : toClaims) {
            if (!matchedToClaimIds.contains(to.getId())) {
                ClaimAttributes toAttr = resolveAttributes(to);
                diffs.add(new ClaimAttributeDiff(
                        toAttr.getProduct(),
                        toAttr.getAttributeType(),
                        toAttr.getAttributeName(),
                        null,
                        toAttr.getValue(),
                        toAttr.getUnit(),
                        toAttr.getBillingPeriod(),
                        "ADDED",
                        true,
                        "HIGH",
                        "New claim introduced in revision: " + to.getClaimText(),
                        null,
                        to.getVerificationStatus().name()
                ));
            }
        }

        return diffs;
    }

    private ClaimAttributes resolveAttributes(Claim claim) {
        if (claim.getClaimedAttributes() != null && !claim.getClaimedAttributes().isBlank()) {
            try {
                return objectMapper.readValue(claim.getClaimedAttributes(), ClaimAttributes.class);
            } catch (Exception e) {
                log.debug("Could not deserialize stored claimedAttributes, re-extracting: {}", e.getMessage());
            }
        }
        ClaimAttributes attrs = attributeExtractionService.extractAttributes(claim.getClaimText(), claim.getClaimType());
        try {
            claim.setClaimedAttributes(objectMapper.writeValueAsString(attrs));
        } catch (Exception ignored) {}
        return attrs;
    }
}

