package com.claimledger.engine;

import com.claimledger.model.KnowledgeDocument;
import com.claimledger.model.enums.ApprovalStatus;
import com.claimledger.model.enums.AuthorityTier;
import com.claimledger.model.enums.VerificationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class AuthorityResolutionEngineTest {

    private AuthorityResolutionEngine engine;
    private UUID deptId;

    @BeforeEach
    void setUp() {
        engine = new AuthorityResolutionEngine();
        deptId = UUID.randomUUID();
    }

    private KnowledgeDocument createDoc(
            String name,
            ApprovalStatus status,
            AuthorityTier tier,
            String version,
            LocalDate effectiveDate,
            LocalDate expiryDate,
            String productScope
    ) {
        KnowledgeDocument doc = new KnowledgeDocument();
        doc.setId(UUID.randomUUID());
        doc.setName(name);
        doc.setApprovalStatus(status);
        doc.setAuthorityTier(tier);
        doc.setVersion(version);
        doc.setEffectiveDate(effectiveDate);
        doc.setExpiryDate(expiryDate);
        doc.setProductScope(productScope);
        doc.setDepartmentId(deptId);
        return doc;
    }

    @Test
    @DisplayName("Step 1: Inactive/Superseded/Draft documents are filtered out")
    void testFilterOutNonApprovedDocuments() {
        KnowledgeDocument supersededDoc = createDoc(
                "Old_Brochure.pdf", ApprovalStatus.SUPERSEDED, AuthorityTier.TIER_3, "v1.0",
                LocalDate.now().minusYears(1), null, "Nexora Pro"
        );
        KnowledgeDocument draftDoc = createDoc(
                "Draft_Spec.pdf", ApprovalStatus.DRAFT, AuthorityTier.TIER_1, "v2.0",
                LocalDate.now(), null, "Nexora Pro"
        );

        List<AuthorityResolutionEngine.DocumentEvidenceCandidate> candidates = List.of(
                new AuthorityResolutionEngine.DocumentEvidenceCandidate(supersededDoc, "Pricing is $79", 0.9),
                new AuthorityResolutionEngine.DocumentEvidenceCandidate(draftDoc, "Pricing is $120", 0.95)
        );

        AuthorityResolutionEngine.ResolutionScopeContext context =
                new AuthorityResolutionEngine.ResolutionScopeContext(deptId, "Nexora Pro", "GLOBAL", "ALL", LocalDate.now());

        AuthorityResolutionResult result = engine.resolveAuthority("Nexora Pro pricing is $120", candidates, context);

        assertEquals(VerificationStatus.UNVERIFIED, result.getVerificationStatus());
    }

    @Test
    @DisplayName("Step 2: Expired and not-yet-effective documents are filtered out")
    void testDateBoundaryFiltering() {
        LocalDate today = LocalDate.of(2026, 11, 8);

        KnowledgeDocument expiredDoc = createDoc(
                "Expired_Price.pdf", ApprovalStatus.APPROVED, AuthorityTier.TIER_1, "v1.0",
                LocalDate.of(2025, 1, 1), LocalDate.of(2026, 1, 1), "Nexora Pro"
        );
        KnowledgeDocument futureDoc = createDoc(
                "Future_Price.pdf", ApprovalStatus.APPROVED, AuthorityTier.TIER_1, "v2.0",
                LocalDate.of(2026, 12, 1), null, "Nexora Pro"
        );

        List<AuthorityResolutionEngine.DocumentEvidenceCandidate> candidates = List.of(
                new AuthorityResolutionEngine.DocumentEvidenceCandidate(expiredDoc, "Price is $100", 0.9),
                new AuthorityResolutionEngine.DocumentEvidenceCandidate(futureDoc, "Price is $150", 0.9)
        );

        AuthorityResolutionEngine.ResolutionScopeContext context =
                new AuthorityResolutionEngine.ResolutionScopeContext(deptId, "Nexora Pro", "GLOBAL", "ALL", today);

        AuthorityResolutionResult result = engine.resolveAuthority("Nexora Pro price", candidates, context);

        assertEquals(VerificationStatus.UNVERIFIED, result.getVerificationStatus());
    }

    @Test
    @DisplayName("Step 4 & 5: TIER_1 takes precedence over TIER_2, and highest version is chosen")
    void testTierPrecedenceAndVersionSelection() {
        KnowledgeDocument tier2Doc = createDoc(
                "Sales_Proposal_v2.pdf", ApprovalStatus.APPROVED, AuthorityTier.TIER_2, "v2.0",
                LocalDate.now().minusMonths(6), null, "Nexora Pro"
        );
        KnowledgeDocument tier1Doc = createDoc(
                "Master_Catalogue_v4.2.pdf", ApprovalStatus.APPROVED, AuthorityTier.TIER_1, "v4.2",
                LocalDate.now().minusMonths(1), null, "Nexora Pro"
        );

        List<AuthorityResolutionEngine.DocumentEvidenceCandidate> candidates = List.of(
                new AuthorityResolutionEngine.DocumentEvidenceCandidate(tier2Doc, "Introductory price is $99 per user per month", 0.9),
                new AuthorityResolutionEngine.DocumentEvidenceCandidate(tier1Doc, "Official enterprise price is $120 per user per month", 0.92)
        );

        AuthorityResolutionEngine.ResolutionScopeContext context =
                new AuthorityResolutionEngine.ResolutionScopeContext(deptId, "Nexora Pro", "GLOBAL", "ALL", LocalDate.now());

        AuthorityResolutionResult result = engine.resolveAuthority("Nexora Pro pricing is $120 per user per month", candidates, context);

        assertEquals(VerificationStatus.VERIFIED, result.getVerificationStatus());
        assertEquals(AuthorityTier.TIER_1, result.getAuthorityTier());
        assertEquals("Master_Catalogue_v4.2.pdf", result.getAuthoritativeDocument().getName());
    }

    @Test
    @DisplayName("Step 6: Violation detected when claim contradicts TIER_1 master document")
    void testViolationDetection() {
        KnowledgeDocument tier1Doc = createDoc(
                "Master_Catalogue_v4.2.pdf", ApprovalStatus.APPROVED, AuthorityTier.TIER_1, "v4.2",
                LocalDate.now().minusMonths(1), null, "Nexora Pro"
        );

        List<AuthorityResolutionEngine.DocumentEvidenceCandidate> candidates = List.of(
                new AuthorityResolutionEngine.DocumentEvidenceCandidate(
                        tier1Doc, "Official enterprise price is $120 per user per month with 99.9% uptime", 0.95
                )
        );

        AuthorityResolutionEngine.ResolutionScopeContext context =
                new AuthorityResolutionEngine.ResolutionScopeContext(deptId, "Nexora Pro", "GLOBAL", "ALL", LocalDate.now());

        // Creator claims $99 instead of $120
        AuthorityResolutionResult result = engine.resolveAuthority("Nexora Pro costs only $99 per user per month", candidates, context);

        assertEquals(VerificationStatus.VIOLATION, result.getVerificationStatus());
        assertNotNull(result.getSuggestedCorrection());
        assertTrue(result.getExplanation().contains("Violation detected"));
    }

    @Test
    @DisplayName("Step 6: Conflict detected when two TIER_1 active documents disagree on numeric facts")
    void testConflictDetectionBetweenTier1Documents() {
        KnowledgeDocument tier1DocA = createDoc(
                "Master_Catalogue_A.pdf", ApprovalStatus.APPROVED, AuthorityTier.TIER_1, "v4.0",
                LocalDate.now().minusMonths(2), null, "Nexora Pro"
        );
        KnowledgeDocument tier1DocB = createDoc(
                "Master_Policy_B.pdf", ApprovalStatus.APPROVED, AuthorityTier.TIER_1, "v4.0",
                LocalDate.now().minusMonths(2), null, "Nexora Pro"
        );

        List<AuthorityResolutionEngine.DocumentEvidenceCandidate> candidates = List.of(
                new AuthorityResolutionEngine.DocumentEvidenceCandidate(
                        tier1DocA, "Guaranteed SLA uptime is 99.9% across all regions", 0.92
                ),
                new AuthorityResolutionEngine.DocumentEvidenceCandidate(
                        tier1DocB, "Guaranteed SLA uptime is 99.5% across all regions", 0.91
                )
        );

        AuthorityResolutionEngine.ResolutionScopeContext context =
                new AuthorityResolutionEngine.ResolutionScopeContext(deptId, "Nexora Pro", "GLOBAL", "ALL", LocalDate.now());

        AuthorityResolutionResult result = engine.resolveAuthority("Nexora Pro provides 99.9% uptime SLA", candidates, context);

        assertEquals(VerificationStatus.CONFLICT, result.getVerificationStatus());
        assertTrue(result.isConflict());
        assertTrue(result.getExplanation().contains("Human review required"));
    }
}
