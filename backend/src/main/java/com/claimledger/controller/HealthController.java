package com.claimledger.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@Tag(name = "System Health", description = "Liveness and readiness endpoints for cloud hosting")
public class HealthController {

    @GetMapping({"/", "/health", "/api/health"})
    @Operation(summary = "Liveness probe for cloud load balancers and Render health checks")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "ClaimLedger Brand Governance Backend",
                "version", "1.0.0",
                "timestamp", Instant.now().toString(),
                "engine", "Deterministic Hierarchy & Neon pgvector"
        ));
    }

    @GetMapping("/api/public/meta")
    @Operation(summary = "Public engine capabilities and verification benchmark metadata for landing & evaluation views")
    public ResponseEntity<Map<String, Object>> publicMeta() {
        return ResponseEntity.ok(Map.of(
                "authorityTiers", 3,
                "governanceRoles", 4,
                "deltaEThreshold", 25.0,
                "automatedTests", 29,
                "testSuites", 8,
                "modalities", java.util.List.of("TEXT", "PDF", "IMAGE"),
                "engineVersion", "v2.0"
        ));
    }
}

