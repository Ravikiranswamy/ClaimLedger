package com.claimledger.dto.document;

import com.claimledger.model.enums.ApprovalStatus;
import com.claimledger.model.enums.AuthorityTier;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public class DocumentUploadRequest {

    @NotBlank(message = "Document name is required")
    private String name;

    private UUID departmentId;

    private ApprovalStatus approvalStatus = ApprovalStatus.APPROVED;

    @NotNull(message = "Authority tier is required")
    private AuthorityTier authorityTier = AuthorityTier.TIER_2;

    @NotBlank(message = "Version is required")
    private String version = "v1.0";

    private LocalDate effectiveDate;
    private LocalDate expiryDate;
    private String productScope;
    private String region = "GLOBAL";
    private String channel = "ALL";

    public DocumentUploadRequest() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
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
}
