package com.claimledger.security;

import com.claimledger.model.enums.Role;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

public class SecurityUtils {

    private SecurityUtils() {
    }

    public static Optional<UserPrincipal> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return Optional.of(principal);
        }
        return Optional.empty();
    }

    public static UserPrincipal getRequiredCurrentUser() {
        return getCurrentUser().orElseThrow(() -> new IllegalStateException("No authenticated user found in security context"));
    }

    public static boolean canAccessDepartment(UUID departmentId) {
        UserPrincipal principal = getRequiredCurrentUser();
        // ADMIN and REVIEWER can access all departments
        if (principal.getRole() == Role.ADMIN || principal.getRole() == Role.REVIEWER) {
            return true;
        }
        // CREATOR and DEPT_MANAGER can only access their assigned department
        return principal.getDepartmentId() != null && principal.getDepartmentId().equals(departmentId);
    }
}
