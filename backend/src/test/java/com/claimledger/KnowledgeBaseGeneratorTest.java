package com.claimledger;

import com.claimledger.model.DocumentChunk;
import com.claimledger.model.KnowledgeDocument;
import com.claimledger.model.enums.ApprovalStatus;
import com.claimledger.model.enums.AuthorityTier;
import com.claimledger.service.EmbeddingService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Generator test that synthesizes physical PDF documents for all knowledge documents
 * in the enhanced knowledge base and writes them to uploads/documents/.
 */
public class KnowledgeBaseGeneratorTest {

    record DocDef(
            UUID id,
            String name,
            String category,
            ApprovalStatus status,
            AuthorityTier tier,
            String version,
            String productScope,
            String region,
            String channel,
            String effectiveDate,
            String expiryDate,
            List<String> chunks
    ) {}

    @Test
    public void generateSqlMigration() throws Exception {
        EmbeddingService embeddingService = new EmbeddingService(null);
        StringBuilder sql = new StringBuilder();
        sql.append("-- V3__knowledge_base_enhancement.sql: Complete Knowledge Base Enhancement\n");
        sql.append("DO $$\n");
        sql.append("DECLARE\n");
        sql.append("    v_org_id UUID := 'a1b2c3d4-0000-0000-0000-000000000001';\n");
        sql.append("    v_mkt_dept_id UUID := 'd0000001-0000-0000-0000-000000000001';\n");
        sql.append("    v_sales_dept_id UUID := 'd0000002-0000-0000-0000-000000000002';\n");
        sql.append("    v_hr_dept_id UUID := 'd0000003-0000-0000-0000-000000000003';\n");
        sql.append("    v_admin_id UUID := '00000001-0000-0000-0000-000000000001';\n");
        sql.append("BEGIN\n\n");

        List<DocDef> docs = getAllDocDefs();
        for (DocDef d : docs) {
            String deptVar = d.name().contains("Sales") ? "v_sales_dept_id"
                    : d.name().contains("Compensation") ? "v_hr_dept_id"
                    : "v_mkt_dept_id";

            sql.append("    -- Document: ").append(d.name()).append("\n");
            sql.append("    INSERT INTO knowledge_documents (\n");
            sql.append("        id, name, file_path, department_id, organisation_id,\n");
            sql.append("        approval_status, authority_tier, version, effective_date, expiry_date,\n");
            sql.append("        product_scope, region, channel, category, chunk_count, uploaded_by, created_at, updated_at\n");
            sql.append("    ) VALUES (\n");
            sql.append("        '").append(d.id()).append("',\n");
            sql.append("        '").append(d.name()).append("',\n");
            sql.append("        'uploads/documents/").append(d.name()).append("',\n");
            sql.append("        ").append(deptVar).append(",\n");
            sql.append("        v_org_id,\n");
            sql.append("        '").append(d.status()).append("',\n");
            sql.append("        '").append(d.tier()).append("',\n");
            sql.append("        '").append(d.version()).append("',\n");
            sql.append("        '").append(d.effectiveDate()).append("',\n");
            sql.append("        ").append(d.expiryDate() != null ? "'" + d.expiryDate() + "'" : "NULL").append(",\n");
            sql.append("        '").append(d.productScope()).append("',\n");
            sql.append("        '").append(d.region()).append("',\n");
            sql.append("        '").append(d.channel()).append("',\n");
            sql.append("        '").append(d.category()).append("',\n");
            sql.append("        ").append(d.chunks().size()).append(",\n");
            sql.append("        v_admin_id,\n");
            sql.append("        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP\n");
            sql.append("    ) ON CONFLICT (id) DO UPDATE SET\n");
            sql.append("        approval_status = EXCLUDED.approval_status,\n");
            sql.append("        authority_tier = EXCLUDED.authority_tier,\n");
            sql.append("        version = EXCLUDED.version,\n");
            sql.append("        product_scope = EXCLUDED.product_scope,\n");
            sql.append("        region = EXCLUDED.region,\n");
            sql.append("        channel = EXCLUDED.channel,\n");
            sql.append("        category = EXCLUDED.category,\n");
            sql.append("        chunk_count = EXCLUDED.chunk_count,\n");
            sql.append("        effective_date = EXCLUDED.effective_date,\n");
            sql.append("        expiry_date = EXCLUDED.expiry_date,\n");
            sql.append("        updated_at = CURRENT_TIMESTAMP;\n\n");

            sql.append("    DELETE FROM document_chunks WHERE document_id = '").append(d.id()).append("';\n");

            for (int i = 0; i < d.chunks().size(); i++) {
                String content = d.chunks().get(i);
                String embedding = embeddingService.getEmbeddingString(content);
                String chunkUuid = String.format("55555555-%04d-0000-0000-%012d",
                        Math.abs(d.id().hashCode() % 10000), i + 1);

                sql.append("    INSERT INTO document_chunks (id, document_id, chunk_index, content, page_number, embedding, created_at)\n");
                sql.append("    VALUES ('").append(chunkUuid).append("', '").append(d.id()).append("', ")
                        .append(i).append(", '").append(content.replace("'", "''")).append("', ")
                        .append(i + 1).append(", '").append(embedding).append("'::vector, CURRENT_TIMESTAMP);\n");
            }
            sql.append("\n");
        }
        sql.append("END $$;\n");

        Path migrationPath = Paths.get("src/main/resources/db/migration/V3__knowledge_base_enhancement.sql").toAbsolutePath();
        if (!Files.exists(migrationPath.getParent())) {
            migrationPath = Paths.get("backend/src/main/resources/db/migration/V3__knowledge_base_enhancement.sql").toAbsolutePath();
        }
        Files.writeString(migrationPath, sql.toString());
        System.out.println("Generated SQL migration at: " + migrationPath);
    }

    @Test
    public void generateAllKnowledgeBasePdfs() throws Exception {
        Path uploadDir = Paths.get("../uploads/documents").toAbsolutePath().normalize();
        if (!Files.exists(uploadDir)) {
            uploadDir = Paths.get("uploads/documents").toAbsolutePath().normalize();
        }
        Files.createDirectories(uploadDir);

        List<DocDef> docs = getAllDocDefs();

        for (DocDef docDef : docs) {
            KnowledgeDocument doc = new KnowledgeDocument();
            doc.setId(docDef.id());
            doc.setName(docDef.name());
            doc.setCategory(docDef.category());
            doc.setApprovalStatus(docDef.status());
            doc.setAuthorityTier(docDef.tier());
            doc.setVersion(docDef.version());
            doc.setProductScope(docDef.productScope());
            doc.setRegion(docDef.region());
            doc.setChannel(docDef.channel());

            List<DocumentChunk> chunks = new ArrayList<>();
            for (int i = 0; i < docDef.chunks().size(); i++) {
                DocumentChunk chunk = new DocumentChunk();
                chunk.setId(UUID.randomUUID());
                chunk.setDocumentId(docDef.id());
                chunk.setChunkIndex(i);
                chunk.setPageNumber(i + 1);
                chunk.setContent(docDef.chunks().get(i));
                chunks.add(chunk);
            }

            Path outputPath = uploadDir.resolve(docDef.name());
            generatePdf(doc, chunks, outputPath);
            assertTrue(Files.exists(outputPath), "PDF should exist: " + outputPath);
        }
    }

    public static List<DocDef> getAllDocDefs() {
        return List.of(
                // 1. Brand_Guidelines_v2.pdf (Tier 1, Approved)
                new DocDef(
                        UUID.fromString("dc000004-0000-0000-0000-000000000004"),
                        "Brand_Guidelines_v2.pdf",
                        "BRAND",
                        ApprovalStatus.APPROVED,
                        AuthorityTier.TIER_1,
                        "2.0",
                        "ALL",
                        "GLOBAL",
                        "ALL",
                        "2026-06-01",
                        "2027-06-30",
                        List.of(
                                "Nexora Brand Guidelines - Product Nomenclature and Messaging: The official product name is strictly 'Nexora Pro' or 'Nexora Pro Elite'. Unapproved informal variant names such as 'Nexora Standard', 'Nexora Lite', or 'Nexora Basic' are brand terminology violations. Brand tone must remain authoritative, professional, and factual.",
                                "Performance and Promotional Claims: Any claim asserting performance improvements (such as '100% faster', 'fastest solution', or '2x speedup') must cite an approved certified laboratory benchmark study. Unsupported superlative claims are strictly prohibited without compliance sign-off."
                        )
                ),
                // 2. Brand_Guidelines_v3.pdf (Tier 1, DRAFT)
                new DocDef(
                        UUID.fromString("dc000008-0000-0000-0000-000000000008"),
                        "Brand_Guidelines_v3.pdf",
                        "BRAND",
                        ApprovalStatus.DRAFT,
                        AuthorityTier.TIER_1,
                        "3.0",
                        "ALL",
                        "GLOBAL",
                        "ALL",
                        "2026-11-01",
                        "2027-10-31",
                        List.of(
                                "Nexora Brand Personality, Tone, and Voice Standards: Brand Personality: Nexora is strictly defined as professional, trustworthy, helpful, and approachable. Tone and Voice: Our communication voice must be consistently respectful, confident, clear, and customer-focused across all marketing copy, sales documents, and public statements. Writing Style: Communicate with formality and precision. Avoid confusing technical jargon, ungrounded superlatives, and passive bureaucratic phrasing. Always prioritize actionable, clear, and direct explanations.",
                                "Prohibited Language and Conduct Guidelines: Insults, offensive expressions, aggressive language, and disrespectful communication are strictly prohibited. Unacceptable Example: 'Our competitor\\'s junk software is a scam and anyone using it is foolish.' Approved Example: 'Nexora Pro delivers 99.9% verified uptime with enterprise governance, helping teams transition from legacy spreadsheets with ease.' Unacceptable Example: 'Buy today or regret it immediately.' Approved Example: 'Explore how Nexora Pro streamlines brand assurance for your enterprise.' Slogans and Messaging Pillars: Official Slogan: 'Create with confidence. Publish with consistency.' Official Positioning: Nexora Technologies is the pioneer in deterministic brand-governance infrastructure.",
                                "Visual Standards and Digital Accessibility (WCAG 2.1 AA): Logo Usage: The Nexora monogram ('CL' monogram) requires clear space equal to 50% of its height on all sides. Minimum reproduction height is 24px digital and 12mm print. Never recolour, distort, stretch, or rotate the logo. Brand Colour Palette: Deep Navy (#0A1F36 - Primary), Brand Teal (#0F766E - Secondary), Light Teal (#5EEAD4 - Accent), Canvas Slate (#F8FAFC). Typography: Inter (UI/Body) and Plus Jakarta Sans (Headings). Digital Accessibility: All digital content must meet WCAG 2.1 AA contrast standards (minimum 4.5:1 text-to-background contrast ratio). All images and graphics require descriptive alternative text (alt text). Form controls and interactive elements must feature visible high-contrast focus rings."
                        )
                ),
                // 3. Approved_Claims_Register.pdf (Tier 1, DRAFT)
                new DocDef(
                        UUID.fromString("dc000009-0000-0000-0000-000000000009"),
                        "Approved_Claims_Register.pdf",
                        "BRAND",
                        ApprovalStatus.DRAFT,
                        AuthorityTier.TIER_1,
                        "1.0",
                        "Nexora Pro",
                        "GLOBAL",
                        "ALL",
                        "2026-11-01",
                        "2027-10-31",
                        List.of(
                                "Approved Promotional Claims Register: The following promotional claims are officially approved for commercial and marketing use: (1) '99.9% guaranteed uptime SLA backed by 24/7 dedicated enterprise support' - Supporting Evidence: Documented infrastructure telemetry and SLA commitment in Product Master Catalogue v4.2. (2) 'Certified SOC 2 Type II, ISO 27001, and fully GDPR compliant' - Supporting Evidence: Independent third-party security audit reports issued Q3 2026. (3) 'System throughput supports 50,000 document governance verifications per hour' - Supporting Evidence: Official enterprise load-testing benchmark report certified by engineering. (4) 'Military-grade AES-256 encryption at rest and TLS 1.3 in transit' - Supporting Evidence: Architecture security specification document.",
                                "Qualified Claims vs Unsupported & Prohibited Claims: Claims Requiring Qualifications: (1) Speed and efficiency claims such as 'up to 2x faster verification' must always include the mandatory qualification: 'when compared to traditional manual review of 50+ page documents; certified by internal productivity benchmark study'. (2) Volume pricing claims must specify: 'applicable exclusively to enterprise contracts exceeding 100 seats'. Prohibited & Unsupported Claims: Claims promising absolute, unsubstantiated guarantees (e.g., '100% error-free guarantee', 'foolproof compliance', 'zero risk guaranteed', or 'flawless brand protection') are strictly prohibited under brand governance. Unsupported superiority claims (e.g., 'the only real AI brand solution on Earth' or 'infinitely superior to all competitors') are prohibited without certified independent third-party market validation."
                        )
                ),
                // 4. Terminology_and_Messaging_Guide.pdf (Tier 1, DRAFT)
                new DocDef(
                        UUID.fromString("dc000010-0000-0000-0000-000000000010"),
                        "Terminology_and_Messaging_Guide.pdf",
                        "TERMINOLOGY",
                        ApprovalStatus.DRAFT,
                        AuthorityTier.TIER_1,
                        "1.0",
                        "ALL",
                        "GLOBAL",
                        "ALL",
                        "2026-11-01",
                        "2027-10-31",
                        List.of(
                                "Official Product Names and Terminology Guide: Official Product Names: The primary brand governance offering must always be named 'Nexora Pro' or 'Nexora Pro Elite'. Strictly prohibited product names include 'Nexora Standard', 'Nexora Lite', 'Nexora Basic', 'Nexora App', or 'The Nexora Tool'. Approved Core Terminology: Use 'Brand Governance Engine', 'Deterministic Authority Hierarchy', 'Evidence-Backed Verification', 'Automated Compliance Audit', and 'Immutable Governance Ledger'. Prohibited Informal Terminology: Do not use informal, colloquial, or punitive terms such as 'AI Judge', 'Grammar Cop', 'Cheat Checker', or 'Fact Bot'. Refer instead to 'Automated Verification' or 'Authorised Human Reviewer'.",
                                "Official Corporate Descriptions and Messaging Pillars: 25-Word Official Description: 'Nexora Technologies provides enterprise-grade AI brand governance platforms that deterministically audit content claims against authoritative multi-tier corporate guidelines before publication.' 50-Word Official Boilerplate: 'Founded to safeguard organisational reputation, Nexora Technologies builds deterministic brand-governance infrastructure. Its flagship platform, ClaimLedger, enables content creators and brand reviewers to verify marketing copy, sales proposals, and corporate communications against strict hierarchical standards in real time.' Core Messaging Pillars: (1) Deterministic Authority: Multi-tier hierarchy ensures company-wide truth supersedes departmental variants. (2) Seamless Workflow: Instant feedback empowers creators while preserving reviewer authority. (3) Immutable Auditability: Cryptographic logs ensure regulatory compliance."
                        )
                ),
                // 5. Product_Master_Catalogue_v4.2.pdf (Tier 1, Approved)
                new DocDef(
                        UUID.fromString("dc000003-0000-0000-0000-000000000003"),
                        "Product_Master_Catalogue_v4.2.pdf",
                        "PRODUCTS",
                        ApprovalStatus.APPROVED,
                        AuthorityTier.TIER_1,
                        "4.2",
                        "Nexora Pro",
                        "GLOBAL",
                        "ALL",
                        "2026-11-01",
                        "2027-10-31",
                        List.of(
                                "Nexora Pro Official Master Specifications: The authoritative enterprise subscription price for Nexora Pro is INR 999 per month (or billed annually). All pricing includes guaranteed 99.9% uptime SLA with 24/7 dedicated enterprise support. Effective date: 01 November 2026. This catalogue is the sole authoritative corporate source of truth for Nexora Pro pricing.",
                                "Security and Compliance Certification: Nexora Pro is certified SOC 2 Type II, ISO 27001, and fully GDPR compliant. High-performance AES-256 encryption is enforced at rest and TLS 1.3 in transit. Brand governance audit trails are preserved immutably for 7 years. System throughput supports 50,000 document governance verifications per hour."
                        )
                ),
                // 6. Nexora_Sales_Proposal_v2.pdf (Tier 2, Approved)
                new DocDef(
                        UUID.fromString("dc000002-0000-0000-0000-000000000002"),
                        "Nexora_Sales_Proposal_v2.pdf",
                        "DEPARTMENTAL",
                        ApprovalStatus.APPROVED,
                        AuthorityTier.TIER_2,
                        "2.1",
                        "Nexora Pro",
                        "GLOBAL",
                        "ALL",
                        "2026-01-01",
                        "2026-12-31",
                        List.of(
                                "Nexora Pro Corporate Sales Proposal (v2.1): Authorized Tier 2 exception specifically negotiated for Acme Corp enterprise agreement. Approved deal price is INR 899 per user per month billed annually (reflecting an approved 10% volume discount from the Tier 1 Master Catalogue base rate of INR 999). Approval conditions: Valid exclusively for Acme Corp account contracts with minimum 100 licensed seats, executed between 2026-01-01 and 2026-12-31. Department scope: Sales Department. Product scope: Nexora Pro. This departmental exception is strictly scoped to Acme Corp and does not alter the universal master price of INR 999 for other accounts.",
                                "Acme Corp Service Level Agreement & Deployment Scope: Deployment includes dedicated enterprise onboarding, 99.5% uptime commitment, and priority support routing. Security: All client data is segregated within tenant partitions with AES-256 encryption. Validity: This contract exception expires on 31 December 2026, after which standard Tier 1 catalogue renewal pricing applies."
                        )
                ),
                // 7. Nexora_Regional_Compensation_Addendum_2026.pdf (Tier 2, Draft)
                new DocDef(
                        UUID.fromString("dc000005-0000-0000-0000-000000000005"),
                        "Nexora_Regional_Compensation_Addendum_2026.pdf",
                        "DEPARTMENTAL",
                        ApprovalStatus.DRAFT,
                        AuthorityTier.TIER_2,
                        "1.2",
                        "All Products",
                        "GLOBAL",
                        "INTERNAL",
                        "2026-11-01",
                        "2027-10-31",
                        List.of(
                                "Nexora Regional Remote Work and Compensation Addendum (2026): Base salaries and remote worker allowances are calibrated according to local economic tier indices. Remote employees in Tier A metro locations receive benchmark compensation, while satellite regional roles are subject to approved geographic parity factors. Department Scope: HR & Compensation. Product Scope: All Products / Universal Workforce.",
                                "Mandatory Adjustment Clauses: Compensation bands and living adjustments must reflect documented cost-of-living differentials approved by the executive remuneration committee. Effective from 2026-11-01 to 2027-10-31."
                        )
                ),
                // 8. Nexora_Old_Brochure_v1.pdf (Tier 3, Superseded)
                new DocDef(
                        UUID.fromString("dc000001-0000-0000-0000-000000000001"),
                        "Nexora_Old_Brochure_v1.pdf",
                        "ASSETS",
                        ApprovalStatus.SUPERSEDED,
                        AuthorityTier.TIER_3,
                        "1.0",
                        "Nexora Pro",
                        "GLOBAL",
                        "ALL",
                        "2025-01-01",
                        "2026-06-30",
                        List.of(
                                "Nexora Pro Legacy Promotional Brochure: Introductory promotional launch rate is INR 799 per month. Target system uptime is 99.0%. SUPERSEDED STATUS: This brochure was retired on 30 June 2026 and is no longer valid. Superseded by Product Master Catalogue v4.2."
                        )
                ),
                // 9. Nexora_APAC_Promotional_Discount_Scheme_Outdated.pdf (Tier 3, Rejected)
                new DocDef(
                        UUID.fromString("dc000007-0000-0000-0000-000000000007"),
                        "Nexora_APAC_Promotional_Discount_Scheme_Outdated.pdf",
                        "ASSETS",
                        ApprovalStatus.REJECTED,
                        AuthorityTier.TIER_3,
                        "0.9",
                        "Nexora Pro",
                        "APAC",
                        "PARTNER",
                        "2025-06-01",
                        "2025-12-31",
                        List.of(
                                "Nexora APAC Promotional Partner Discount Scheme (2025 - Outdated): Regional resellers may quote an introductory discounted tier of INR 699/user/month upon executive signoff. REJECTED: Contains outdated promotional discount rate conflicting with Tier 1 Master Catalogue pricing."
                        )
                ),
                // 10. Nexora_Q4_Social_Media_Copywriting_Kit.pdf (Tier 3, Draft)
                new DocDef(
                        UUID.fromString("dc000006-0000-0000-0000-000000000006"),
                        "Nexora_Q4_Social_Media_Copywriting_Kit.pdf",
                        "BRAND",
                        ApprovalStatus.DRAFT,
                        AuthorityTier.TIER_3,
                        "1.0",
                        "Nexora Pro",
                        "APAC",
                        "SOCIAL",
                        "2026-11-01",
                        "2027-03-31",
                        List.of(
                                "Nexora Q4 Social Media & APAC Influencer Copywriting Guide: For short-form social posts, refer to Nexora Pro as an enterprise AI governance engine. Any mention of price must state the official INR 999/month rate."
                        )
                )
        );
    }

    private void generatePdf(KnowledgeDocument doc, List<DocumentChunk> chunks, Path outputPath) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font fontOblique = new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);

            Map<Integer, List<DocumentChunk>> pageMap = chunks.stream()
                    .collect(Collectors.groupingBy(
                            c -> c.getPageNumber(),
                            TreeMap::new,
                            Collectors.toList()
                    ));

            if (pageMap.isEmpty()) pageMap.put(1, List.of());

            for (Map.Entry<Integer, List<DocumentChunk>> entry : pageMap.entrySet()) {
                int pageNum = entry.getKey();
                PDPage page = new PDPage(PDRectangle.A4);
                document.addPage(page);

                try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                    // Header Banner (#0A1F36)
                    cs.setNonStrokingColor(10 / 255f, 31 / 255f, 54 / 255f);
                    cs.addRect(0, 775, 595.28f, 66.89f);
                    cs.fill();

                    // Header Title
                    cs.setNonStrokingColor(1f, 1f, 1f);
                    cs.beginText();
                    cs.setFont(fontBold, 13);
                    cs.newLineAtOffset(36, 810);
                    cs.showText(sanitizeText(doc.getName()));
                    cs.endText();

                    // Header Subtitle
                    cs.beginText();
                    cs.setFont(fontRegular, 8.5f);
                    cs.newLineAtOffset(36, 792);
                    String metaStr = "Tier: " + doc.getAuthorityTier() + " | Version: " + doc.getVersion() +
                            " | Scope: " + (doc.getProductScope() != null ? doc.getProductScope() : "Universal") +
                            " | Status: " + doc.getApprovalStatus();
                    cs.showText(sanitizeText(metaStr));
                    cs.endText();

                    // Body
                    float y = 745;
                    List<DocumentChunk> pageChunks = entry.getValue();
                    for (DocumentChunk chunk : pageChunks) {
                        if (y < 90) break;

                        // Chunk header in Teal (#0F766E)
                        cs.setNonStrokingColor(15 / 255f, 118 / 255f, 110 / 255f);
                        cs.beginText();
                        cs.setFont(fontBold, 9.5f);
                        cs.newLineAtOffset(36, y);
                        int idx = chunk.getChunkIndex() + 1;
                        cs.showText("--- Section / Chunk #" + idx + " (Authoritative Source Content) ---");
                        cs.endText();
                        y -= 16;

                        // Content
                        cs.setNonStrokingColor(30 / 255f, 41 / 255f, 59 / 255f);
                        List<String> wrapped = wrapText(chunk.getContent(), 80);
                        for (String line : wrapped) {
                            if (y < 70) break;
                            cs.beginText();
                            cs.setFont(fontRegular, 9.5f);
                            cs.newLineAtOffset(36, y);
                            cs.showText(sanitizeText(line));
                            cs.endText();
                            y -= 14;
                        }
                        y -= 12;
                    }

                    // Footer Divider and text
                    cs.setStrokingColor(226 / 255f, 232 / 255f, 240 / 255f);
                    cs.moveTo(36, 45);
                    cs.lineTo(559, 45);
                    cs.stroke();

                    cs.setNonStrokingColor(148 / 255f, 163 / 255f, 184 / 255f);
                    cs.beginText();
                    cs.setFont(fontRegular, 8);
                    cs.newLineAtOffset(36, 30);
                    cs.showText("ClaimLedger Brand Governance Document Repository | Page " + pageNum + " of " + pageMap.size());
                    cs.endText();
                }
            }
            document.save(outputPath.toFile());
        }
    }

    private String sanitizeText(String text) {
        if (text == null) return "";
        return text.replace("₹", "INR ")
                .replace("“", "\"")
                .replace("”", "\"")
                .replace("‘", "'")
                .replace("’", "'")
                .replaceAll("[^\\x00-\\x7F]", " ");
    }

    private List<String> wrapText(String text, int maxLineLength) {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isBlank()) return lines;
        String[] words = text.split("\\s+");
        StringBuilder current = new StringBuilder();
        for (String word : words) {
            if (current.length() + word.length() + 1 > maxLineLength) {
                if (current.length() > 0) lines.add(current.toString());
                current = new StringBuilder(word);
            } else {
                if (current.length() > 0) current.append(" ");
                current.append(word);
            }
        }
        if (current.length() > 0) lines.add(current.toString());
        return lines;
    }
}
