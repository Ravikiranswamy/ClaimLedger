package com.claimledger.dto.submission;

import com.claimledger.model.Claim;
import com.claimledger.model.enums.ClaimType;
import com.claimledger.model.enums.VerificationStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ClaimResponse {

    private UUID id;
    private UUID submissionId;
    private String claimText;
    private ClaimType claimType;
    private VerificationStatus verificationStatus;
    private String explanation;
    private String suggestedCorrection;
    private BigDecimal aiConfidence;
    private LocalDateTime createdAt;
    private List<EvidenceResponse> evidence = new ArrayList<>();

    public ClaimResponse() {
    }

    public static ClaimResponse fromEntity(Claim claim, List<EvidenceResponse> evidenceList) {
        ClaimResponse response = new ClaimResponse();
        response.setId(claim.getId());
        response.setSubmissionId(claim.getSubmissionId());
        response.setClaimText(claim.getClaimText());
        response.setClaimType(claim.getClaimType());
        response.setVerificationStatus(claim.getVerificationStatus());
        response.setExplanation(claim.getExplanation());
        response.setSuggestedCorrection(claim.getSuggestedCorrection());
        response.setAiConfidence(claim.getAiConfidence());
        response.setCreatedAt(claim.getCreatedAt());
        response.setEvidence(evidenceList != null ? evidenceList : new ArrayList<>());
        return response;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getSubmissionId() {
        return submissionId;
    }

    public void setSubmissionId(UUID submissionId) {
        this.submissionId = submissionId;
    }

    public String getClaimText() {
        return claimText;
    }

    public void setClaimText(String claimText) {
        this.claimText = claimText;
    }

    public ClaimType getClaimType() {
        return claimType;
    }

    public void setClaimType(ClaimType claimType) {
        this.claimType = claimType;
    }

    public VerificationStatus getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(VerificationStatus verificationStatus) {
        this.verificationStatus = verificationStatus;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public String getSuggestedCorrection() {
        return suggestedCorrection;
    }

    public void setSuggestedCorrection(String suggestedCorrection) {
        this.suggestedCorrection = suggestedCorrection;
    }

    public BigDecimal getAiConfidence() {
        return aiConfidence;
    }

    public void setAiConfidence(BigDecimal aiConfidence) {
        this.aiConfidence = aiConfidence;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<EvidenceResponse> getEvidence() {
        return evidence;
    }

    public void setEvidence(List<EvidenceResponse> evidence) {
        this.evidence = evidence;
    }
}
