package com.claimledger.dto.campaign;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class CampaignResponse {
    private UUID id;
    private String code;
    private String name;
    private String description;
    private UUID organisationId;
    private UUID departmentId;
    private String allowedProductScope;
    private String allowedDiscountPrice;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean isApproved;
    private UUID createdBy;
    private LocalDateTime createdAt;
    private boolean isActive;
    private boolean isExpired;
    private String governanceNote;

    public CampaignResponse() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public UUID getOrganisationId() { return organisationId; }
    public void setOrganisationId(UUID organisationId) { this.organisationId = organisationId; }
    public UUID getDepartmentId() { return departmentId; }
    public void setDepartmentId(UUID departmentId) { this.departmentId = departmentId; }
    public String getAllowedProductScope() { return allowedProductScope; }
    public void setAllowedProductScope(String s) { this.allowedProductScope = s; }
    public String getAllowedDiscountPrice() { return allowedDiscountPrice; }
    public void setAllowedDiscountPrice(String s) { this.allowedDiscountPrice = s; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public boolean isApproved() { return isApproved; }
    public void setApproved(boolean approved) { isApproved = approved; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
    public boolean isExpired() { return isExpired; }
    public void setExpired(boolean expired) { isExpired = expired; }
    public String getGovernanceNote() { return governanceNote; }
    public void setGovernanceNote(String governanceNote) { this.governanceNote = governanceNote; }
}

