package com.claimledger.controller;

import com.claimledger.dto.common.ApiResponse;
import com.claimledger.dto.auth.UserResponse;
import com.claimledger.dto.user.UserCreateRequest;
import com.claimledger.dto.user.UserUpdateRequest;
import com.claimledger.security.UserPrincipal;
import com.claimledger.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@Tag(name = "User Management", description = "Admin endpoints for managing organisation employees, roles, and permissions")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all organisation users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> listUsers() {
        List<UserResponse> users = userService.listUsers();
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get user details by ID")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID id) {
        UserResponse user = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Invite or create a new organisation user")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody UserCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserResponse created = userService.createUser(request, principal.getId(), principal.getOrganisationId());
        return ResponseEntity.ok(ApiResponse.ok("User invited successfully", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update user role, department, active status, or knowledge approval permission")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable UUID id,
            @RequestBody UserUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserResponse updated = userService.updateUser(id, request, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("User updated successfully", updated));
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Toggle user active/suspended status")
    public ResponseEntity<ApiResponse<UserResponse>> toggleStatus(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserResponse updated = userService.toggleUserStatus(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("User status toggled", updated));
    }
}
