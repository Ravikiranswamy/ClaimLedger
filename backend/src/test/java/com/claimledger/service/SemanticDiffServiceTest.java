package com.claimledger.service;

import com.claimledger.dto.diff.ClaimAttributeDiff;
import com.claimledger.dto.diff.ClaimAttributes;
import com.claimledger.dto.diff.SemanticDiffResponse;
import com.claimledger.dto.diff.TextDiffChunk;
import com.claimledger.model.Claim;
import com.claimledger.model.SubmissionRevision;
import com.claimledger.model.enums.ClaimType;
import com.claimledger.model.enums.ContentType;
import com.claimledger.model.enums.VerificationStatus;
import com.claimledger.repository.ClaimRepository;
import com.claimledger.repository.SubmissionRevisionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SemanticDiffServiceTest {

    @Mock
    private SubmissionRevisionRepository submissionRevisionRepository;

    @Mock
    private ClaimRepository claimRepository;

    private ClaimAttributeExtractionService attributeExtractionService;
    private ObjectMapper objectMapper;
    private SemanticDiffService semanticDiffService;

    @BeforeEach
    void setUp() {
        attributeExtractionService = new ClaimAttributeExtractionService();
        objectMapper = new ObjectMapper();
        semanticDiffService = new SemanticDiffService(
                submissionRevisionRepository,
                claimRepository,
                attributeExtractionService,
                objectMapper
        );
    }

    @Test
    @DisplayName("Layer 1: Text Diff properly tracks word additions, removals, and unchanged tokens")
    void testTextDiffTokenization() {
        String oldText = "Nexora Pro costs ₹999 per user per month.";
        String newText = "Subscribe to Nexora Pro for just ₹799 monthly.";

        List<TextDiffChunk> chunks = semanticDiffService.computeTextDiff(oldText, newText);
        assertNotNull(chunks);
        assertFalse(chunks.isEmpty());

        boolean hasAdded = chunks.stream().anyMatch(c -> c.getType() == TextDiffChunk.DiffType.ADDED);
        boolean hasRemoved = chunks.stream().anyMatch(c -> c.getType() == TextDiffChunk.DiffType.REMOVED);
        boolean hasUnchanged = chunks.stream().anyMatch(c -> c.getType() == TextDiffChunk.DiffType.UNCHANGED);

        assertTrue(hasAdded, "Should contain added words");
        assertTrue(hasRemoved, "Should contain removed words");
        assertTrue(hasUnchanged, "Should contain unchanged words (e.g. Nexora Pro)");
    }

    @Test
    @DisplayName("Layer 2: Claim attribute diff detects price drop from ₹999 to ₹799 with high severity reverification")
    void testPriceAttributeChangeDetection() throws Exception {
        UUID subId = UUID.randomUUID();

        SubmissionRevision rev1 = new SubmissionRevision(
                subId, 1, "Nexora Pro costs ₹999 per user per month.", "Initial marketing draft",
                null, ContentType.TEXT, 1, 1, 0, 0, 0, "Initial"
        );
        SubmissionRevision rev2 = new SubmissionRevision(
                subId, 2, "Subscribe to Nexora Pro for just ₹799 monthly.", "Updated pricing per discount campaign",
                null, ContentType.TEXT, 1, 0, 1, 0, 0, "Price revision"
        );

        when(submissionRevisionRepository.findBySubmissionIdAndRevisionNumber(subId, 1))
                .thenReturn(Optional.of(rev1));
        when(submissionRevisionRepository.findBySubmissionIdAndRevisionNumber(subId, 2))
                .thenReturn(Optional.of(rev2));

        Claim claim1 = new Claim();
        claim1.setId(UUID.randomUUID());
        claim1.setSubmissionId(subId);
        claim1.setRevisionNumber(1);
        claim1.setClaimText("Nexora Pro costs ₹999 per user per month.");
        claim1.setClaimType(ClaimType.PRICE);
        claim1.setVerificationStatus(VerificationStatus.VERIFIED);
        ClaimAttributes attr1 = attributeExtractionService.extractAttributes(claim1.getClaimText(), claim1.getClaimType());
        claim1.setClaimedAttributes(objectMapper.writeValueAsString(attr1));

        Claim claim2 = new Claim();
        claim2.setId(UUID.randomUUID());
        claim2.setSubmissionId(subId);
        claim2.setRevisionNumber(2);
        claim2.setClaimText("Subscribe to Nexora Pro for just ₹799 monthly.");
        claim2.setClaimType(ClaimType.PRICE);
        claim2.setVerificationStatus(VerificationStatus.VIOLATION);
        ClaimAttributes attr2 = attributeExtractionService.extractAttributes(claim2.getClaimText(), claim2.getClaimType());
        claim2.setClaimedAttributes(objectMapper.writeValueAsString(attr2));

        when(claimRepository.findBySubmissionIdAndRevisionNumber(subId, 1)).thenReturn(List.of(claim1));
        when(claimRepository.findBySubmissionIdAndRevisionNumber(subId, 2)).thenReturn(List.of(claim2));

        SemanticDiffResponse diff = semanticDiffService.computeDiff(subId, 1, 2);

        assertNotNull(diff);
        assertEquals(1, diff.getFromRevision());
        assertEquals(2, diff.getToRevision());
        assertEquals(1, diff.getTotalClaimsChanged());
        assertTrue(diff.isReverificationRequired(), "Re-verification MUST be required when price changes");

        List<ClaimAttributeDiff> claimDiffs = diff.getClaimDiffs();
        assertEquals(1, claimDiffs.size());

        ClaimAttributeDiff priceDiff = claimDiffs.get(0);
        assertEquals("PRICE", priceDiff.getAttributeType());
        assertEquals("₹999", priceDiff.getPreviousValue());
        assertEquals("₹799", priceDiff.getNewValue());
        assertEquals("HIGH", priceDiff.getSeverity());
        assertEquals("MODIFIED", priceDiff.getChangeType());
        assertEquals("VERIFIED", priceDiff.getPreviousStatus());
        assertEquals("VIOLATION", priceDiff.getNewStatus());
        assertTrue(priceDiff.getSummary().contains("₹999 to ₹799"));
    }

    @Test
    @DisplayName("Layer 2: Wording revision without attribute change preserves validity without requiring reverification")
    void testRephrasingWithoutFactChange() throws Exception {
        UUID subId = UUID.randomUUID();

        SubmissionRevision rev1 = new SubmissionRevision(
                subId, 1, "Nexora Pro delivers 99.9% uptime SLA.", null,
                null, ContentType.TEXT, 1, 1, 0, 0, 0, "Initial"
        );
        SubmissionRevision rev2 = new SubmissionRevision(
                subId, 2, "Enjoy 99.9% guaranteed uptime SLA availability with Nexora Pro.", null,
                null, ContentType.TEXT, 1, 1, 0, 0, 0, "Rephrasing"
        );

        when(submissionRevisionRepository.findBySubmissionIdAndRevisionNumber(subId, 1))
                .thenReturn(Optional.of(rev1));
        when(submissionRevisionRepository.findBySubmissionIdAndRevisionNumber(subId, 2))
                .thenReturn(Optional.of(rev2));

        Claim claim1 = new Claim();
        claim1.setId(UUID.randomUUID());
        claim1.setSubmissionId(subId);
        claim1.setRevisionNumber(1);
        claim1.setClaimText("Nexora Pro delivers 99.9% uptime SLA.");
        claim1.setClaimType(ClaimType.FEATURE);
        claim1.setVerificationStatus(VerificationStatus.VERIFIED);

        Claim claim2 = new Claim();
        claim2.setId(UUID.randomUUID());
        claim2.setSubmissionId(subId);
        claim2.setRevisionNumber(2);
        claim2.setClaimText("Enjoy 99.9% guaranteed uptime SLA availability with Nexora Pro.");
        claim2.setClaimType(ClaimType.FEATURE);
        claim2.setVerificationStatus(VerificationStatus.VERIFIED);

        when(claimRepository.findBySubmissionIdAndRevisionNumber(subId, 1)).thenReturn(List.of(claim1));
        when(claimRepository.findBySubmissionIdAndRevisionNumber(subId, 2)).thenReturn(List.of(claim2));

        SemanticDiffResponse diff = semanticDiffService.computeDiff(subId, 1, 2);

        assertNotNull(diff);
        assertFalse(diff.isReverificationRequired(), "No re-verification required when SLA attribute remains 99.9%");
        assertEquals("LOW", diff.getClaimDiffs().get(0).getSeverity());
    }
}

