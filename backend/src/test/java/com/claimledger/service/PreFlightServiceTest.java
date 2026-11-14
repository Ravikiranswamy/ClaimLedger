package com.claimledger.service;

import com.claimledger.dto.preflight.PreFlightRequest;
import com.claimledger.dto.preflight.PreFlightResponse;
import com.claimledger.engine.AuthorityResolutionEngine;
import com.claimledger.engine.AuthorityResolutionResult;
import com.claimledger.model.KnowledgeDocument;
import com.claimledger.model.enums.ClaimType;
import com.claimledger.model.enums.Role;
import com.claimledger.model.enums.VerificationStatus;
import com.claimledger.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PreFlightServiceTest {

    @Mock
    private ClaimExtractionService claimExtractionService;

    @Mock
    private RagRetrievalService ragRetrievalService;

    @Mock
    private AuthorityResolutionEngine authorityResolutionEngine;

    @Mock
    private CampaignService campaignService;

    private PreFlightService preFlightService;

    private static final UUID ORG_ID = UUID.fromString("a1b2c3d4-0000-0000-0000-000000000001");
    private static final UUID USER_ID = UUID.fromString("00000001-0000-0000-0000-000000000001");

    private UserPrincipal principal;

    @BeforeEach
    void setUp() {
        preFlightService = new PreFlightService(
                claimExtractionService,
                ragRetrievalService,
                authorityResolutionEngine,
                campaignService
        );

        principal = new UserPrincipal(
                USER_ID,
                "author@nexora.com",
                "password",
                "Author User",
                Role.CREATOR,
                null,
                ORG_ID,
                List.of(new SimpleGrantedAuthority("ROLE_CREATOR"))
        );
    }

    @Test
    @DisplayName("Pre-flight lightweight mode uses heuristic extraction and returns latency")
    void testLightweightPreFlightCheck() {
        String testText = "Get Nexora Pro for ₹799 per month.";
        PreFlightRequest request = new PreFlightRequest(testText, "LIGHTWEIGHT", null, null);

        ClaimExtractionService.ExtractedClaim extracted = new ClaimExtractionService.ExtractedClaim(
                testText,
                ClaimType.PRICE,
                BigDecimal.valueOf(0.98)
        );
        when(claimExtractionService.extractClaimsHeuristic(testText)).thenReturn(List.of(extracted));
        when(ragRetrievalService.retrieveRelevantChunks(eq(testText), eq(3))).thenReturn(List.of());
        when(ragRetrievalService.toCandidates(anyList())).thenReturn(List.of());

        KnowledgeDocument doc = new KnowledgeDocument();
        doc.setName("Brand_Guidelines_v3.pdf");
        doc.setAuthorityTier(com.claimledger.model.enums.AuthorityTier.TIER_1);

        AuthorityResolutionResult resolution = AuthorityResolutionResult.violation(
                doc,
                "Authoritative price is ₹999/month",
                "Change ₹799 to ₹999"
        );
        when(authorityResolutionEngine.resolveAuthority(eq(testText), anyList(), any())).thenReturn(resolution);

        PreFlightResponse response = preFlightService.checkContent(request, principal);

        assertNotNull(response);
        assertEquals("LIGHTWEIGHT", response.getMode());
        assertEquals(1, response.getTotalClaims());
        assertEquals(1, response.getViolations());
        assertFalse(response.isCompliant());
        assertTrue(response.getLatencyMs() >= 0);
        assertEquals(1, response.getClaims().size());
        assertEquals(VerificationStatus.VIOLATION, response.getClaims().get(0).getStatus());

        verify(claimExtractionService, times(1)).extractClaimsHeuristic(testText);
        verify(claimExtractionService, never()).extractClaims(anyString());
    }

    @Test
    @DisplayName("Pre-flight with valid campaign exception returns verified status")
    void testPreFlightWithValidCampaign() {
        String testText = "Nexora Pro special festive price ₹799.";
        PreFlightRequest request = new PreFlightRequest(testText, "LIGHTWEIGHT", "DIWALI_SPECIAL", null);

        CampaignService.CampaignValidationResult validCamp =
                CampaignService.CampaignValidationResult.valid(new com.claimledger.model.Campaign());
        when(campaignService.validateCampaignForSubmission(eq("DIWALI_SPECIAL"), eq(ORG_ID))).thenReturn(validCamp);

        when(claimExtractionService.extractClaimsHeuristic(testText)).thenReturn(List.of());

        PreFlightResponse response = preFlightService.checkContent(request, principal);

        assertNotNull(response);
        assertEquals(1, response.getTotalClaims());
        assertEquals(1, response.getVerified());
        assertTrue(response.isCompliant());
        assertEquals("Registered Campaign Governance", response.getClaims().get(0).getAuthoritativeSource());
    }
}
