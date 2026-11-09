package com.claimledger.dto.organisation;

import java.util.UUID;

public class DepartmentDto {
    private UUID id;
    private String name;
    private String code;
    private String description;
    private Boolean isActive;
    private long userCount;
    private long documentCount;

    public DepartmentDto() {
    }

    public DepartmentDto(UUID id, String name, String code, String description, Boolean isActive, long userCount, long documentCount) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.description = description;
        this.isActive = isActive;
        this.userCount = userCount;
        this.documentCount = documentCount;
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

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public long getUserCount() {
        return userCount;
    }

    public void setUserCount(long userCount) {
        this.userCount = userCount;
    }

    public long getDocumentCount() {
        return documentCount;
    }

    public void setDocumentCount(long documentCount) {
        this.documentCount = documentCount;
    }
}

