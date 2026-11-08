package com.claimledger.controller;

import com.claimledger.dto.common.ApiResponse;
import com.claimledger.dto.review.ReviewActionResponse;
import com.claimledger.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/submissions")
@Tag(name = "Audit", description = "Chronological audit trail for governance submissions")
public class AuditController {

    private final ReviewService reviewService;

    public AuditController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/{id}/audit")
    @Operation(summary = "Get full chronological audit trail and review history for a submission")
    public ResponseEntity<ApiResponse<List<ReviewActionResponse>>> getAuditTrail(@PathVariable UUID id) {
        List<ReviewActionResponse> history = reviewService.getAuditHistory(id);
        return ResponseEntity.ok(ApiResponse.ok(history));
    }
}
