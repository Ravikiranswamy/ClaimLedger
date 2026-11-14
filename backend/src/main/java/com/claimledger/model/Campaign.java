package com.claimledger.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "campaigns")
public class Campaign {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "organisation_id", nullable = false)
    private UUID organisationId;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "allowed_product_scope", length = 100)
    private String allowedProductScope = "Nexora Pro";

    @Column(name = "allowed_discount_price", length = 50)
    private String allowedDiscountPrice;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "is_approved", nullable = false)
    private boolean isApproved = true;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Campaign() {}

    public Campaign(UUID id, String code, String name, String description, UUID organisationId,
                    UUID departmentId, String allowedProductScope, String allowedDiscountPrice,
                    LocalDate startDate, LocalDate endDate, boolean isApproved, UUID createdBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.code = code;
        this.name = name;
        this.description = description;
        this.organisationId = organisationId;
        this.departmentId = departmentId;
        this.allowedProductScope = allowedProductScope;
        this.allowedDiscountPrice = allowedDiscountPrice;
        this.startDate = startDate;
        this.endDate = endDate;
        this.isApproved = isApproved;
        this.createdBy = createdBy;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public UUID getOrganisationId() {
        return organisationId;
    }

    public void setOrganisationId(UUID organisationId) {
        this.organisationId = organisationId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public String getAllowedProductScope() {
        return allowedProductScope;
    }

    public void setAllowedProductScope(String allowedProductScope) {
        this.allowedProductScope = allowedProductScope;
    }

    public String getAllowedDiscountPrice() {
        return allowedDiscountPrice;
    }

    public void setAllowedDiscountPrice(String allowedDiscountPrice) {
        this.allowedDiscountPrice = allowedDiscountPrice;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public boolean isApproved() {
        return isApproved;
    }

    public void setApproved(boolean approved) {
        isApproved = approved;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(UUID createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

