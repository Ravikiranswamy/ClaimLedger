package com.claimledger.controller;

import com.claimledger.dto.common.ApiResponse;
import com.claimledger.dto.review.ReviewActionResponse;
import com.claimledger.model.enums.Role;
import com.claimledger.security.UserPrincipal;
import com.claimledger.service.ReviewService;
import com.claimledger.service.SubmissionWorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/submissions")
@Tag(name = "Audit", description = "Chronological audit trail for governance submissions")
public class AuditController {

    private final ReviewService reviewService;
    private final SubmissionWorkflowService workflowService;

    public AuditController(ReviewService reviewService, SubmissionWorkflowService workflowService) {
        this.reviewService = reviewService;
        this.workflowService = workflowService;
    }

    @GetMapping("/audit")
    @Operation(summary = "Get global or creator-scoped chronological audit history")
    public ResponseEntity<ApiResponse<List<ReviewActionResponse>>> getGlobalAuditTrail(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<ReviewActionResponse> history;
        if (principal != null && principal.getRole() == Role.CREATOR) {
            history = reviewService.getAuditHistoryForCreator(principal.getId());
        } else {
            history = reviewService.getAllAuditHistory(principal != null ? principal.getOrganisationId() : null);
        }
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    @GetMapping("/{id}/audit")
    @Operation(summary = "Get full chronological audit trail and review history for a submission")
    public ResponseEntity<ApiResponse<List<ReviewActionResponse>>> getAuditTrail(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal != null) {
            workflowService.validateSubmissionAccess(id, principal);
        }
        List<ReviewActionResponse> history = reviewService.getAuditHistory(id);
        return ResponseEntity.ok(ApiResponse.ok(history));
    }
}
