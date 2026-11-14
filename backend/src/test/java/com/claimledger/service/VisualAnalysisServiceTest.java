package com.claimledger.service;

import com.claimledger.model.KnowledgeDocument;
import com.claimledger.model.Submission;
import com.claimledger.model.enums.ApprovalStatus;
import com.claimledger.model.enums.AuthorityTier;
import com.claimledger.model.enums.VerificationStatus;
import com.claimledger.repository.KnowledgeDocumentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.awt.Color;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class VisualAnalysisServiceTest {

    private GeminiClientService geminiClient;
    private KnowledgeDocumentRepository documentRepository;
    private ObjectMapper objectMapper;
    private VisualAnalysisService service;

    @BeforeEach
    void setUp() {
        geminiClient = Mockito.mock(GeminiClientService.class);
        documentRepository = Mockito.mock(KnowledgeDocumentRepository.class);
        objectMapper = new ObjectMapper();
        service = new VisualAnalysisService(geminiClient, documentRepository, objectMapper);
    }

    @Test
    @DisplayName("CIELAB ΔE accurately scores exact brand colors with near-zero distance")
    void testExactBrandColorDeltaE() {
        // Deep Navy #0A1F36
        Color navy = new Color(10, 31, 54);
        double[] navyLab = service.rgbToLab(navy);
        double de = service.deltaE76(navyLab, navyLab);
        assertEquals(0.0, de, 0.001, "Identical colors must have ΔE = 0.0");

        List<VisualAnalysisService.DominantColorDetail> scores =
                service.scoreDominantColors(List.of("#0A1F36", "#0F766E"));
        assertEquals(2, scores.size());
        assertTrue(scores.get(0).isApproved());
        assertEquals(0.0, scores.get(0).deltaE(), 0.1);
        assertEquals("Deep Navy", scores.get(0).nearestApprovedName());
        assertTrue(scores.get(1).isApproved());
        assertEquals(0.0, scores.get(1).deltaE(), 0.1);
        assertEquals("Primary Teal", scores.get(1).nearestApprovedName());
    }

    @Test
    @DisplayName("CIELAB ΔE identifies electric pink as an off-brand violation (> 25 ΔE)")
    void testOffBrandColorDeltaE() {
        // Neon / electric pink: #FF1493
        List<VisualAnalysisService.DominantColorDetail> scores =
                service.scoreDominantColors(List.of("#FF1493"));
        assertEquals(1, scores.size());
        assertFalse(scores.get(0).isApproved(), "Neon pink must violate Nexora corporate brand palette");
        assertTrue(scores.get(0).deltaE() > 40.0, "Neon pink should have a large ΔE (> 40) against navy/teal");
    }

    @Test
    @DisplayName("CIELAB ΔE permits slight teal tint variants within perceptual tolerance")
    void testSlightColorVariantTolerance() {
        // Slight variant of Teal (#117A72 vs #0F766E)
        List<VisualAnalysisService.DominantColorDetail> scores =
                service.scoreDominantColors(List.of("#117A72"));
        assertEquals(1, scores.size());
        assertTrue(scores.get(0).isApproved(), "Slight teal variant within 10 ΔE should be approved");
        assertTrue(scores.get(0).deltaE() < 10.0);
    }

    @Test
    @DisplayName("Logo matching flags unapproved / competitor logos as VIOLATION")
    void testUnapprovedLogoMatching() throws IOException {
        UUID orgId = UUID.randomUUID();
        Submission sub = new Submission();
        sub.setId(UUID.randomUUID());
        sub.setOrganisationId(orgId);
        sub.setTitle("Summer Promotion");

        KnowledgeDocument assetDoc = new KnowledgeDocument();
        assetDoc.setId(UUID.randomUUID());
        assetDoc.setName("Brand_Guidelines_v2.pdf");
        assetDoc.setApprovalStatus(ApprovalStatus.APPROVED);
        assetDoc.setCategory("BRAND");
        assetDoc.setAuthorityTier(AuthorityTier.TIER_1);

        when(documentRepository.findByOrganisationId(orgId)).thenReturn(List.of(assetDoc));

        // Create temporary dummy image file named with 'wrong_logo'
        File tempFile = Files.createTempFile("promo_wrong_logo_", ".png").toFile();
        tempFile.deleteOnExit();

        VisualAnalysisService.VisualAnalysisResult result = service.analyzeImageSubmission(sub, tempFile);

        boolean hasLogoViolation = result.visualFindings().stream()
                .anyMatch(vf -> vf.claim().getVerificationStatus() == VerificationStatus.VIOLATION
                        && vf.claim().getClaimText().contains("Unapproved Logo Asset"));
        assertTrue(hasLogoViolation, "An unapproved logo variant must generate an explicit VIOLATION finding");
    }

    @Test
    @DisplayName("Standalone logo content-type bypasses layout palette violations")
    void testStandaloneLogoBypass() throws IOException {
        UUID orgId = UUID.randomUUID();
        Submission sub = new Submission();
        sub.setId(UUID.randomUUID());
        sub.setOrganisationId(orgId);
        sub.setTitle("Official Nexora Standalone Logo");
        sub.setCreatorNotes("Standalone logo asset for press kit");

        KnowledgeDocument assetDoc = new KnowledgeDocument();
        assetDoc.setId(UUID.randomUUID());
        assetDoc.setName("Brand_Guidelines_v2.pdf");
        assetDoc.setApprovalStatus(ApprovalStatus.APPROVED);
        assetDoc.setCategory("BRAND");
        assetDoc.setAuthorityTier(AuthorityTier.TIER_1);

        when(documentRepository.findByOrganisationId(orgId)).thenReturn(List.of(assetDoc));

        File tempFile = Files.createTempFile("standalone_logo_", ".png").toFile();
        tempFile.deleteOnExit();

        VisualAnalysisService.VisualAnalysisResult result = service.analyzeImageSubmission(sub, tempFile);

        boolean hasStandaloneBypass = result.visualFindings().stream()
                .anyMatch(vf -> vf.claim().getClaimText().contains("Standalone Brand Asset Bypass")
                        && vf.claim().getVerificationStatus() == VerificationStatus.VERIFIED);
        assertTrue(hasStandaloneBypass, "Standalone logo must have Standalone Brand Asset Bypass verified finding");

        boolean hasPaletteViolation = result.visualFindings().stream()
                .anyMatch(vf -> vf.claim().getClaimText().contains("Off-Brand Color"));
        assertFalse(hasPaletteViolation, "Standalone logo must NOT receive full layout palette violations");
    }
}

