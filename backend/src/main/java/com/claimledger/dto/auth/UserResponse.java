package com.claimledger.dto.auth;

import com.claimledger.model.User;
import com.claimledger.model.enums.Role;

import java.time.LocalDateTime;
import java.util.UUID;

public class UserResponse {

    private UUID id;
    private String email;
    private String fullName;
    private String name;
    private String role;
    private String department;
    private UUID departmentId;
    private UUID organisationId;
    private Boolean isActive = true;
    private Boolean canApproveKnowledge = false;
    private LocalDateTime createdAt;

    public UserResponse() {
    }

    public static UserResponse fromUser(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setFullName(user.getFullName());
        response.setName(user.getFullName());

        // Role string
        response.setRole(user.getRole() != null ? user.getRole().name() : "CREATOR");

        // Map department name
        if (user.getDepartmentId() != null) {
            String deptIdStr = user.getDepartmentId().toString();
            if (deptIdStr.contains("d0000001")) {
                response.setDepartment("MARKETING");
            } else if (deptIdStr.contains("d0000002")) {
                response.setDepartment("SALES");
            } else if (deptIdStr.contains("d0000003")) {
                response.setDepartment("HR");
            } else {
                response.setDepartment("MARKETING");
            }
        }

        response.setDepartmentId(user.getDepartmentId());
        response.setOrganisationId(user.getOrganisationId());
        response.setIsActive(user.getIsActive());
        response.setCanApproveKnowledge(user.getCanApproveKnowledge());
        response.setCreatedAt(user.getCreatedAt());
        return response;
    }

    // Getters and Setters
    public Boolean getIsActive() {
        return isActive != null ? isActive : true;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public Boolean getCanApproveKnowledge() {
        return canApproveKnowledge != null ? canApproveKnowledge : false;
    }

    public void setCanApproveKnowledge(Boolean canApproveKnowledge) {
        this.canApproveKnowledge = canApproveKnowledge;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getName() {
        return name != null ? name : fullName;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
