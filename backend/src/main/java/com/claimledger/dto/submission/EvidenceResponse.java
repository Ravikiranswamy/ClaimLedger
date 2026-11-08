package com.claimledger.dto.submission;

import com.claimledger.model.Evidence;
import com.claimledger.model.enums.AuthorityTier;

import java.math.BigDecimal;
import java.util.UUID;

public class EvidenceResponse {

    private UUID id;
    private UUID claimId;
    private UUID documentId;
    private String documentName;
    private UUID chunkId;
    private String excerpt;
    private Integer pageNumber;
    private BigDecimal relevanceScore;
    private boolean isAuthoritative;
    private AuthorityTier authorityTier;

    public EvidenceResponse() {
    }

    public static EvidenceResponse fromEntity(Evidence evidence, String documentName) {
        EvidenceResponse response = new EvidenceResponse();
        response.setId(evidence.getId());
        response.setClaimId(evidence.getClaimId());
        response.setDocumentId(evidence.getDocumentId());
        response.setDocumentName(documentName);
        response.setChunkId(evidence.getChunkId());
        response.setExcerpt(evidence.getExcerpt());
        response.setPageNumber(evidence.getPageNumber());
        response.setRelevanceScore(evidence.getRelevanceScore());
        response.setAuthoritative(evidence.isAuthoritative());
        response.setAuthorityTier(evidence.getAuthorityTier());
        return response;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getClaimId() {
        return claimId;
    }

    public void setClaimId(UUID claimId) {
        this.claimId = claimId;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public void setDocumentId(UUID documentId) {
        this.documentId = documentId;
    }

    public String getDocumentName() {
        return documentName;
    }

    public void setDocumentName(String documentName) {
        this.documentName = documentName;
    }

    public UUID getChunkId() {
        return chunkId;
    }

    public void setChunkId(UUID chunkId) {
        this.chunkId = chunkId;
    }

    public String getExcerpt() {
        return excerpt;
    }

    public void setExcerpt(String excerpt) {
        this.excerpt = excerpt;
    }

    public Integer getPageNumber() {
        return pageNumber;
    }

    public void setPageNumber(Integer pageNumber) {
        this.pageNumber = pageNumber;
    }

    public BigDecimal getRelevanceScore() {
        return relevanceScore;
    }

    public void setRelevanceScore(BigDecimal relevanceScore) {
        this.relevanceScore = relevanceScore;
    }

    public boolean isAuthoritative() {
        return isAuthoritative;
    }

    public void setAuthoritative(boolean authoritative) {
        isAuthoritative = authoritative;
    }

    public AuthorityTier getAuthorityTier() {
        return authorityTier;
    }

    public void setAuthorityTier(AuthorityTier authorityTier) {
        this.authorityTier = authorityTier;
    }
}
