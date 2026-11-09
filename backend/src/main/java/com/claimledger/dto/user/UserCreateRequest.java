package com.claimledger.dto.user;

import com.claimledger.model.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public class UserCreateRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    private String email;

    @NotBlank(message = "Full name is required")
    private String fullName;

    private Role role = Role.CREATOR;

    private UUID departmentId;

    private Boolean canApproveKnowledge = false;

    private String password;

    public UserCreateRequest() {
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

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public Boolean getCanApproveKnowledge() {
        return canApproveKnowledge;
    }

    public void setCanApproveKnowledge(Boolean canApproveKnowledge) {
        this.canApproveKnowledge = canApproveKnowledge;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
