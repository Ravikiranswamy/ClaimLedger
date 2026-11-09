package com.claimledger.dto.organisation;

import java.time.LocalDateTime;
import java.util.UUID;

public class OrganisationProfileResponse {
    private UUID id;
    private String name;
    private String slug;
    private String description;
    private String website;
    private String contactEmail;
    private LocalDateTime createdAt;

    public OrganisationProfileResponse() {
    }

    public OrganisationProfileResponse(UUID id, String name, String slug, String description, String website, String contactEmail, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.website = website;
        this.contactEmail = contactEmail;
        this.createdAt = createdAt;
    }

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

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getWebsite() {
        return website;
    }

    public void setWebsite(String website) {
        this.website = website;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

