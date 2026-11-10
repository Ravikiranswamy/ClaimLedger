package com.claimledger.controller;

import com.claimledger.dto.auth.AuthResponse;
import com.claimledger.dto.auth.LoginRequest;
import com.claimledger.dto.auth.RegisterRequest;
import com.claimledger.dto.auth.UserResponse;
import com.claimledger.dto.common.ApiResponse;
import com.claimledger.security.UserPrincipal;
import com.claimledger.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@Tag(name = "Authentication", description = "User authentication and profile endpoints")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping({"/api/auth/login", "/api/login"})
    @Operation(summary = "Authenticate user and receive JWT token")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", response.getToken());
        result.put("tokenType", response.getTokenType());
        result.put("user", response.getUser());
        result.put("success", true);
        result.put("message", "Login successful");
        result.put("data", response);

        return ResponseEntity.ok(result);
    }

    @PostMapping({"/api/auth/register", "/api/register"})
    @Operation(summary = "Register new account and provision new organisation workspace")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", response.getToken());
        result.put("tokenType", response.getTokenType());
        result.put("user", response.getUser());
        result.put("success", true);
        result.put("message", "Organisation workspace created successfully");
        result.put("data", response);

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping({"/api/auth/me", "/api/me"})
    @Operation(summary = "Get current authenticated user profile")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        UserResponse response = authService.getCurrentUser(principal);
        return ResponseEntity.ok(response);
    }
}
