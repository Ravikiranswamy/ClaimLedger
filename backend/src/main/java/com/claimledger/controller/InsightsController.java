package com.claimledger.controller;

import com.claimledger.dto.common.ApiResponse;
import com.claimledger.dto.insights.GovernanceInsightsResponse;
import com.claimledger.model.enums.Role;
import com.claimledger.security.UserPrincipal;
import com.claimledger.service.InsightsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/insights")
@Tag(name = "Governance Insights", description = "Organisation-wide brand intelligence, violation trends, and guideline health")
public class InsightsController {

    private final InsightsService insightsService;

    public InsightsController(InsightsService insightsService) {
        this.insightsService = insightsService;
    }

    @GetMapping
    @Operation(summary = "Get organisation-wide governance insights, violation trends, and guideline health")
    public ResponseEntity<ApiResponse<GovernanceInsightsResponse>> getInsights(
            @RequestParam(value = "departmentId", required = false) UUID departmentId,
            @RequestParam(value = "dateRange", required = false) String dateRange,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        GovernanceInsightsResponse insights = insightsService.getInsights(departmentFilter(departmentId, principal), dateRange);
        return ResponseEntity.ok(ApiResponse.ok(insights));
    }

    private UUID departmentFilter(UUID requestedDeptId, UserPrincipal principal) {
        if (principal == null) return requestedDeptId;
        // Dept Managers are scoped to their department
        if (principal.getRole() == Role.DEPT_MANAGER && principal.getDepartmentId() != null) {
            return principal.getDepartmentId();
        }
        return requestedDeptId;
    }
}
