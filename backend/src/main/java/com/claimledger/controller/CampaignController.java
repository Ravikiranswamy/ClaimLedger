package com.claimledger.controller;

import com.claimledger.dto.campaign.CampaignRequest;
import com.claimledger.dto.campaign.CampaignResponse;
import com.claimledger.dto.common.ApiResponse;
import com.claimledger.security.UserPrincipal;
import com.claimledger.service.CampaignService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/campaigns")
@Tag(name = "Campaign Governance", description = "Scoped authority resolution — campaign exception registration and validation. Creators cannot self-declare campaign exceptions.")
public class CampaignController {

    private final CampaignService campaignService;

    public CampaignController(CampaignService campaignService) {
        this.campaignService = campaignService;
    }

    @PostMapping
    @Operation(summary = "Register a campaign exception (ADMIN or DEPT_MANAGER only). Creators cannot self-grant campaign exceptions — a campaign code is a reference, not proof of permission.")
    public ResponseEntity<ApiResponse<CampaignResponse>> registerCampaign(
            @Valid @RequestBody CampaignRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        CampaignResponse response = campaignService.registerCampaign(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Campaign registered successfully", response));
    }

    @GetMapping
    @Operation(summary = "List all registered campaigns for the current organisation, with active/expired status")
    public ResponseEntity<ApiResponse<List<CampaignResponse>>> listCampaigns(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(campaignService.listCampaigns(principal)));
    }

    @GetMapping("/validate/{code}")
    @Operation(summary = "Validate whether a campaign code is currently active, approved, and within its exception window for this organisation")
    public ResponseEntity<ApiResponse<CampaignService.CampaignValidationResult>> validateCampaign(
            @PathVariable String code,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        CampaignService.CampaignValidationResult result =
                campaignService.validateCampaignForSubmission(code, principal.getOrganisationId());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}

