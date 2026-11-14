package com.claimledger.controller;

import com.claimledger.dto.common.ApiResponse;
import com.claimledger.dto.preflight.PreFlightRequest;
import com.claimledger.dto.preflight.PreFlightResponse;
import com.claimledger.security.UserPrincipal;
import com.claimledger.service.PreFlightService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/preflight")
@Tag(name = "Pre-Flight Verification", description = "Low-latency content verification API for external integrations and preview tools")
public class PreFlightController {

    private final PreFlightService preFlightService;

    public PreFlightController(PreFlightService preFlightService) {
        this.preFlightService = preFlightService;
    }

    @PostMapping("/check")
    @Operation(summary = "Execute lightweight or full pre-flight verification on a piece of text")
    public ResponseEntity<ApiResponse<PreFlightResponse>> checkContent(
            @Valid @RequestBody PreFlightRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        PreFlightResponse result = preFlightService.checkContent(request, principal);
        return ResponseEntity.ok(ApiResponse.ok("Pre-flight check completed", result));
    }
}

