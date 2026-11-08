package com.claimledger.engine;

import com.claimledger.model.KnowledgeDocument;
import com.claimledger.model.enums.AuthorityTier;
import com.claimledger.model.enums.VerificationStatus;

import java.util.Collections;
import java.util.List;

public class AuthorityResolutionResult {

    private final VerificationStatus verificationStatus;
    private final KnowledgeDocument authoritativeDocument;
    private final AuthorityTier authorityTier;
    private final String explanation;
    private final String suggestedCorrection;
    private final List<KnowledgeDocument> evaluatedDocuments;
    private final boolean conflict;
    private final String conflictDetails;

    public AuthorityResolutionResult(
            VerificationStatus verificationStatus,
            KnowledgeDocument authoritativeDocument,
            AuthorityTier authorityTier,
            String explanation,
            String suggestedCorrection,
            List<KnowledgeDocument> evaluatedDocuments,
            boolean conflict,
            String conflictDetails
    ) {
        this.verificationStatus = verificationStatus;
        this.authoritativeDocument = authoritativeDocument;
        this.authorityTier = authorityTier;
        this.explanation = explanation;
        this.suggestedCorrection = suggestedCorrection;
        this.evaluatedDocuments = evaluatedDocuments != null ? evaluatedDocuments : Collections.emptyList();
        this.conflict = conflict;
        this.conflictDetails = conflictDetails;
    }

    public static AuthorityResolutionResult unverified(String reason) {
        return new AuthorityResolutionResult(
                VerificationStatus.UNVERIFIED,
                null,
                null,
                reason != null ? reason : "No active, approved authoritative evidence found matching claim scope.",
                null,
                Collections.emptyList(),
                false,
                null
        );
    }

    public static AuthorityResolutionResult conflict(String details, List<KnowledgeDocument> conflictingDocs) {
        return new AuthorityResolutionResult(
                VerificationStatus.CONFLICT,
                null,
                AuthorityTier.TIER_1,
                "Equal-authority sources (TIER_1) disagree on facts: " + details + ". Human review required.",
                "Escalate to department manager or brand reviewer to resolve conflicting authoritative sources.",
                conflictingDocs,
                true,
                details
        );
    }

    public static AuthorityResolutionResult verified(KnowledgeDocument doc, String explanation) {
        return new AuthorityResolutionResult(
                VerificationStatus.VERIFIED,
                doc,
                doc.getAuthorityTier(),
                explanation,
                null,
                List.of(doc),
                false,
                null
        );
    }

    public static AuthorityResolutionResult violation(KnowledgeDocument doc, String explanation, String suggestedCorrection) {
        return new AuthorityResolutionResult(
                VerificationStatus.VIOLATION,
                doc,
                doc.getAuthorityTier(),
                explanation,
                suggestedCorrection,
                List.of(doc),
                false,
                null
        );
    }

    // Getters
    public VerificationStatus getVerificationStatus() {
        return verificationStatus;
    }

    public KnowledgeDocument getAuthoritativeDocument() {
        return authoritativeDocument;
    }

    public AuthorityTier getAuthorityTier() {
        return authorityTier;
    }

    public String getExplanation() {
        return explanation;
    }

    public String getSuggestedCorrection() {
        return suggestedCorrection;
    }

    public List<KnowledgeDocument> getEvaluatedDocuments() {
        return evaluatedDocuments;
    }

    public boolean isConflict() {
        return conflict;
    }

    public String getConflictDetails() {
        return conflictDetails;
    }
}
