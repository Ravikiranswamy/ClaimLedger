package com.claimledger.dto.document;

import com.claimledger.model.KnowledgeDocument;
import com.claimledger.model.enums.ApprovalStatus;
import com.claimledger.model.enums.AuthorityTier;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class DocumentResponse {

    private UUID id;
    private String name;
    private String filePath;
    private UUID departmentId;
    private UUID organisationId;
    private ApprovalStatus approvalStatus;
    private AuthorityTier authorityTier;
    private String version;
    private LocalDate effectiveDate;
    private LocalDate expiryDate;
    private String productScope;
    private String region;
    private String channel;
    private String category;
    private UUID uploadedBy;
    private LocalDateTime createdAt;
    private long chunkCount;

    public DocumentResponse() {
    }

    public static DocumentResponse fromEntity(KnowledgeDocument doc, long chunkCount) {
        DocumentResponse response = new DocumentResponse();
        response.setId(doc.getId());
        response.setName(doc.getName());
        response.setFilePath(doc.getFilePath());
        response.setDepartmentId(doc.getDepartmentId());
        response.setOrganisationId(doc.getOrganisationId());
        response.setApprovalStatus(doc.getApprovalStatus());
        response.setAuthorityTier(doc.getAuthorityTier());
        response.setVersion(doc.getVersion());
        response.setEffectiveDate(doc.getEffectiveDate());
        response.setExpiryDate(doc.getExpiryDate());
        response.setProductScope(doc.getProductScope());
        response.setRegion(doc.getRegion());
        response.setChannel(doc.getChannel());
        response.setCategory(doc.getCategory());
        response.setUploadedBy(doc.getUploadedBy());
        response.setCreatedAt(doc.getCreatedAt());
        response.setChunkCount(chunkCount);
        return response;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public UUID getOrganisationId() {
        return organisationId;
    }

    public void setOrganisationId(UUID organisationId) {
        this.organisationId = organisationId;
    }

    public ApprovalStatus getApprovalStatus() {
        return approvalStatus;
    }

    public void setApprovalStatus(ApprovalStatus approvalStatus) {
        this.approvalStatus = approvalStatus;
    }

    public AuthorityTier getAuthorityTier() {
        return authorityTier;
    }

    public void setAuthorityTier(AuthorityTier authorityTier) {
        this.authorityTier = authorityTier;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public LocalDate getEffectiveDate() {
        return effectiveDate;
    }

    public void setEffectiveDate(LocalDate effectiveDate) {
        this.effectiveDate = effectiveDate;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

    public String getProductScope() {
        return productScope;
    }

    public void setProductScope(String productScope) {
        this.productScope = productScope;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public UUID getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(UUID uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public long getChunkCount() {
        return chunkCount;
    }

    public void setChunkCount(long chunkCount) {
        this.chunkCount = chunkCount;
    }
}
