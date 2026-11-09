package com.claimledger.dto.user;

import com.claimledger.model.enums.Role;
import java.util.UUID;

public class UserUpdateRequest {

    private Role role;
    private UUID departmentId;
    private Boolean isActive;
    private Boolean canApproveKnowledge;

    public UserUpdateRequest() {
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

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public Boolean getCanApproveKnowledge() {
        return canApproveKnowledge;
    }

    public void setCanApproveKnowledge(Boolean canApproveKnowledge) {
        this.canApproveKnowledge = canApproveKnowledge;
    }
}
