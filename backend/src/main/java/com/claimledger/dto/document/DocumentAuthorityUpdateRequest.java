package com.claimledger.dto.document;

import com.claimledger.model.enums.AuthorityTier;

import java.time.LocalDate;
import java.util.UUID;

public class DocumentAuthorityUpdateRequest {

    private AuthorityTier authorityTier;
    private UUID departmentId;
    private String productScope;
    private String region;
    private String channel;
    private String category;
    private LocalDate effectiveDate;
    private LocalDate expiryDate;
    private String version;

    public DocumentAuthorityUpdateRequest() {
    }

    public AuthorityTier getAuthorityTier() {
        return authorityTier;
    }

    public void setAuthorityTier(AuthorityTier authorityTier) {
        this.authorityTier = authorityTier;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
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

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }
}

