package com.claimledger.dto.campaign;

import java.time.LocalDate;
import java.util.UUID;

public class CampaignRequest {
    private String code;
    private String name;
    private String description;
    private UUID departmentId;
    private String allowedProductScope;
    private String allowedDiscountPrice;
    private LocalDate startDate;
    private LocalDate endDate;

    public CampaignRequest() {}

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
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
}

