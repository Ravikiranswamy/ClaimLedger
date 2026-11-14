package com.claimledger.service;

import com.claimledger.dto.preflight.PreFlightRequest;
import com.claimledger.dto.preflight.PreFlightResponse;
import com.claimledger.engine.AuthorityResolutionEngine;
import com.claimledger.engine.AuthorityResolutionResult;
import com.claimledger.model.enums.ClaimType;
import com.claimledger.model.enums.VerificationStatus;
import com.claimledger.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class PreFlightService {

    private static final Logger log = LoggerFactory.getLogger(PreFlightService.class);

    private final ClaimExtractionService claimExtractionService;
    private final RagRetrievalService ragRetrievalService;
    private final AuthorityResolutionEngine authorityResolutionEngine;
    private final CampaignService campaignService;

    public PreFlightService(
            ClaimExtractionService claimExtractionService,
            RagRetrievalService ragRetrievalService,
            AuthorityResolutionEngine authorityResolutionEngine,
            CampaignService campaignService
    ) {
        this.claimExtractionService = claimExtractionService;
        this.ragRetrievalService = ragRetrievalService;
        this.authorityResolutionEngine = authorityResolutionEngine;
        this.campaignService = campaignService;
    }

    public PreFlightResponse checkContent(PreFlightRequest request, UserPrincipal currentUser) {
        long startTime = System.currentTimeMillis();
        String mode = request.getMode() != null ? request.getMode().toUpperCase().trim() : "LIGHTWEIGHT";
        boolean isLightweight = "LIGHTWEIGHT".equals(mode);

        UUID orgId = currentUser.getOrganisationId() != null 
                ? currentUser.getOrganisationId() 
                : UUID.fromString("a1b2c3d4-0000-0000-0000-000000000001");
        UUID deptId = request.getDepartmentId() != null ? request.getDepartmentId() : currentUser.getDepartmentId();

        List<PreFlightResponse.PreFlightClaimResult> claimResults = new ArrayList<>();
        int violations = 0;
        int verified = 0;
        int conflicts = 0;
        int unverified = 0;

        // 1. Check Campaign Code Exception if provided
        String campaignCode = request.getCampaignCode();
        if (campaignCode != null && !campaignCode.isBlank()) {
            CampaignService.CampaignValidationResult campRes = 
                    campaignService.validateCampaignForSubmission(campaignCode, orgId);
            if (campRes.getStatus() == CampaignService.CampaignValidationResult.Status.VALID) {
                claimResults.add(new PreFlightResponse.PreFlightClaimResult(
                        "Campaign exception referenced: '" + campaignCode + "'",
                        ClaimType.PROMOTION,
                        VerificationStatus.VERIFIED,
                        campRes.getMessage(),
                        null,
                        "Registered Campaign Governance"
                ));
                verified++;
            } else if (campRes.getStatus() == CampaignService.CampaignValidationResult.Status.INVALID 
                    || campRes.getStatus() == CampaignService.CampaignValidationResult.Status.EXPIRED) {
                claimResults.add(new PreFlightResponse.PreFlightClaimResult(
                        "Campaign exception referenced: '" + campaignCode + "'",
                        ClaimType.PROMOTION,
                        VerificationStatus.VIOLATION,
                        campRes.getMessage() + " (Unregistered/Expired campaign cannot bypass rules)",
                        "Remove the invalid campaign reference or get it approved by an admin.",
                        "Registered Campaign Governance"
                ));
                violations++;
            }
        }

        // 2. Extract Claims based on Mode (Lightweight: heuristic regex; Full: AI/Gemini)
        List<ClaimExtractionService.ExtractedClaim> extracted = isLightweight
                ? claimExtractionService.extractClaimsHeuristic(request.getText())
                : claimExtractionService.extractClaims(request.getText());

        AuthorityResolutionEngine.ResolutionScopeContext scopeContext =
                new AuthorityResolutionEngine.ResolutionScopeContext(
                        deptId,
                        null,
                        "GLOBAL",
                        "ALL",
                        LocalDate.now()
                );

        int topK = isLightweight ? 3 : 5;

        for (ClaimExtractionService.ExtractedClaim ec : extracted) {
            List<RagRetrievalService.RetrievedChunk> chunks = 
                    ragRetrievalService.retrieveRelevantChunks(ec.claimText(), topK);
            List<AuthorityResolutionEngine.DocumentEvidenceCandidate> candidates = 
                    ragRetrievalService.toCandidates(chunks);

            AuthorityResolutionResult resolution = 
                    authorityResolutionEngine.resolveAuthority(ec.claimText(), candidates, scopeContext);

            VerificationStatus status = resolution.getVerificationStatus();
            if (status == VerificationStatus.VIOLATION) violations++;
            else if (status == VerificationStatus.VERIFIED) verified++;
            else if (status == VerificationStatus.CONFLICT) conflicts++;
            else if (status == VerificationStatus.UNVERIFIED) unverified++;

            String source = resolution.getAuthoritativeDocument() != null 
                    ? resolution.getAuthoritativeDocument().getName() 
                    : (chunks.isEmpty() ? "No authoritative source found" : chunks.get(0).document().getName());

            claimResults.add(new PreFlightResponse.PreFlightClaimResult(
                    ec.claimText(),
                    ec.claimType(),
                    status,
                    resolution.getExplanation(),
                    resolution.getSuggestedCorrection(),
                    source
            ));
        }

        long latencyMs = System.currentTimeMillis() - startTime;

        PreFlightResponse response = new PreFlightResponse();
        response.setMode(mode);
        response.setLatencyMs(latencyMs);
        response.setTotalClaims(claimResults.size());
        response.setViolations(violations);
        response.setVerified(verified);
        response.setConflicts(conflicts);
        response.setUnverified(unverified);
        response.setCompliant(violations == 0 && conflicts == 0);
        response.setClaims(claimResults);

        if (violations > 0) {
            response.setSummary(String.format("Found %d compliance violation(s). Re-check claims before publishing.", violations));
        } else if (conflicts > 0) {
            response.setSummary(String.format("Found %d conflicting guideline policy point(s). Review required.", conflicts));
        } else if (verified > 0) {
            response.setSummary("All analyzed claims conform with authoritative brand rules and pricing.");
        } else {
            response.setSummary("No definitive factual or brand claims detected in the text.");
        }

        log.info("Pre-flight check ({}) completed in {}ms. Total claims: {}, Violations: {}", 
                mode, latencyMs, claimResults.size(), violations);

        return response;
    }
}
