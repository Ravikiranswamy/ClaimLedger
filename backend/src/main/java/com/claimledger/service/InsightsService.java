package com.claimledger.service;

import com.claimledger.dto.insights.*;
import com.claimledger.model.Claim;
import com.claimledger.model.Department;
import com.claimledger.model.KnowledgeDocument;
import com.claimledger.model.Submission;
import com.claimledger.model.enums.ApprovalStatus;
import com.claimledger.model.enums.ClaimType;
import com.claimledger.model.enums.SubmissionStatus;
import com.claimledger.model.enums.VerificationStatus;
import com.claimledger.repository.ClaimRepository;
import com.claimledger.repository.DepartmentRepository;
import com.claimledger.repository.KnowledgeDocumentRepository;
import com.claimledger.repository.SubmissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class InsightsService {

    private final SubmissionRepository submissionRepository;
    private final ClaimRepository claimRepository;
    private final KnowledgeDocumentRepository documentRepository;
    private final DepartmentRepository departmentRepository;

    public InsightsService(
            SubmissionRepository submissionRepository,
            ClaimRepository claimRepository,
            KnowledgeDocumentRepository documentRepository,
            DepartmentRepository departmentRepository
    ) {
        this.submissionRepository = submissionRepository;
        this.claimRepository = claimRepository;
        this.documentRepository = documentRepository;
        this.departmentRepository = departmentRepository;
    }

    public GovernanceInsightsResponse getInsights(UUID departmentFilter, String dateRangeFilter) {
        GovernanceInsightsResponse response = new GovernanceInsightsResponse();

        List<Submission> allSubmissions = submissionRepository.findAllByOrderByCreatedAtDesc();
        List<Claim> allClaims = claimRepository.findAll();
        List<KnowledgeDocument> allDocs = documentRepository.findAll();
        List<Department> departments = departmentRepository.findAll();

        // Filter submissions by department if specified
        List<Submission> filteredSubmissions = allSubmissions;
        if (departmentFilter != null) {
            filteredSubmissions = allSubmissions.stream()
                    .filter(s -> departmentFilter.equals(s.getDepartmentId()))
                    .collect(Collectors.toList());
        }

        Set<UUID> submissionIds = filteredSubmissions.stream().map(Submission::getId).collect(Collectors.toSet());
        List<Claim> filteredClaims = allClaims.stream()
                .filter(c -> submissionIds.contains(c.getSubmissionId()))
                .collect(Collectors.toList());

        // 1. Overview
        GovernanceOverviewDto overview = new GovernanceOverviewDto();
        long totalSubs = filteredSubmissions.size();
        long flaggedSubs = filteredSubmissions.stream()
                .filter(s -> s.getStatus() == SubmissionStatus.FLAGGED || s.getStatus() == SubmissionStatus.CHANGES_REQUESTED || s.getStatus() == SubmissionStatus.REJECTED)
                .count();
        long approvedSubs = filteredSubmissions.stream()
                .filter(s -> s.getStatus() == SubmissionStatus.APPROVED)
                .count();

        long totalC = filteredClaims.size();
        long verifiedC = filteredClaims.stream().filter(c -> c.getVerificationStatus() == VerificationStatus.VERIFIED).count();
        long violationC = filteredClaims.stream().filter(c -> c.getVerificationStatus() == VerificationStatus.VIOLATION).count();
        long unverifiedC = filteredClaims.stream().filter(c -> c.getVerificationStatus() == VerificationStatus.UNVERIFIED).count();
        long conflictC = filteredClaims.stream().filter(c -> c.getVerificationStatus() == VerificationStatus.CONFLICT).count();

        double complianceRate = totalC > 0 ? (double) verifiedC / totalC * 100.0 : 100.0;

        LocalDate today = LocalDate.now();
        LocalDate expiryThreshold = today.plusDays(60);

        long activeD = allDocs.stream().filter(d -> d.getApprovalStatus() == ApprovalStatus.APPROVED).count();
        long expiredD = allDocs.stream().filter(d -> d.getApprovalStatus() == ApprovalStatus.EXPIRED || (d.getExpiryDate() != null && d.getExpiryDate().isBefore(today))).count();
        long expiringSoonD = allDocs.stream().filter(d -> d.getApprovalStatus() == ApprovalStatus.APPROVED && d.getExpiryDate() != null && d.getExpiryDate().isAfter(today) && d.getExpiryDate().isBefore(expiryThreshold)).count();

        overview.setTotalSubmissions(totalSubs);
        overview.setFlaggedSubmissions(flaggedSubs);
        overview.setApprovedSubmissions(approvedSubs);
        overview.setTotalClaims(totalC);
        overview.setVerifiedClaims(verifiedC);
        overview.setViolationClaims(violationC);
        overview.setUnverifiedClaims(unverifiedC);
        overview.setConflictClaims(conflictC);
        overview.setComplianceRate(Math.round(complianceRate * 10.0) / 10.0);
        overview.setActiveDocuments(activeD);
        overview.setExpiredDocuments(expiredD);
        overview.setExpiringSoonDocuments(expiringSoonD);

        response.setOverview(overview);

        // 2. Violation Categories
        Map<ClaimType, List<Claim>> byType = filteredClaims.stream()
                .filter(c -> c.getVerificationStatus() != VerificationStatus.VERIFIED)
                .collect(Collectors.groupingBy(Claim::getClaimType));

        long totalIssues = filteredClaims.stream().filter(c -> c.getVerificationStatus() != VerificationStatus.VERIFIED).count();
        List<ViolationCategoryDto> violationCategories = new ArrayList<>();

        Map<ClaimType, String[]> typeMetadata = Map.of(
                ClaimType.PRICE, new String[]{"Pricing Inconsistencies", "HIGH", "Discrepancies against Tier 1 Master Product Catalogue."},
                ClaimType.PROMOTION, new String[]{"Unsubstantiated Superlatives", "MEDIUM", "Subjective superlatives ('fastest', '#1') lacking authoritative benchmark citations."},
                ClaimType.FACTUAL, new String[]{"Policy Misalignment", "HIGH", "Factual assertions conflicting with internal HR or operational guidelines."},
                ClaimType.TERMINOLOGY, new String[]{"Brand Terminology Drift", "LOW", "Use of non-standard branding nomenclature or obsolete trademarks."}
        );

        for (Map.Entry<ClaimType, String[]> entry : typeMetadata.entrySet()) {
            ClaimType type = entry.getKey();
            List<Claim> claims = byType.getOrDefault(type, Collections.emptyList());
            long count = claims.size();
            double pct = totalIssues > 0 ? (double) count / totalIssues * 100.0 : 0.0;
            String sample = claims.isEmpty() ? "No active violations recorded" : claims.get(0).getClaimText();

            violationCategories.add(new ViolationCategoryDto(
                    type.name(),
                    entry.getValue()[0],
                    count,
                    Math.round(pct * 10.0) / 10.0,
                    entry.getValue()[1],
                    entry.getValue()[2],
                    sample
            ));
        }
        // Sort descending by count
        violationCategories.sort((a, b) -> Long.compare(b.getCount(), a.getCount()));
        response.setViolationCategories(violationCategories);

        // 3. Department Compliance Breakdown
        Map<UUID, String> deptNames = departments.stream().collect(Collectors.toMap(Department::getId, Department::getName));
        Map<UUID, List<Submission>> byDept = allSubmissions.stream()
                .filter(s -> s.getDepartmentId() != null)
                .collect(Collectors.groupingBy(Submission::getDepartmentId));

        List<DepartmentComplianceDto> deptDtos = new ArrayList<>();
        for (Department dept : departments) {
            List<Submission> deptSubs = byDept.getOrDefault(dept.getId(), Collections.emptyList());
            long total = deptSubs.size();
            long flagged = deptSubs.stream().filter(s -> s.getStatus() == SubmissionStatus.FLAGGED || s.getStatus() == SubmissionStatus.CHANGES_REQUESTED || s.getStatus() == SubmissionStatus.REJECTED).count();
            long approved = deptSubs.stream().filter(s -> s.getStatus() == SubmissionStatus.APPROVED).count();
            double cleanRate = total > 0 ? (double) (total - flagged) / total * 100.0 : 100.0;

            String friction = "Low friction";
            if ("Sales".equalsIgnoreCase(dept.getName())) {
                friction = "Tier 2 discount proposal conflicts vs Master Catalog";
            } else if ("Marketing".equalsIgnoreCase(dept.getName())) {
                friction = "Outdated price mentions (₹799) and unverified superlatives";
            } else if ("HR".equalsIgnoreCase(dept.getName())) {
                friction = "Regional wage parity claims vs local cost-of-living policy";
            }

            deptDtos.add(new DepartmentComplianceDto(
                    dept.getId(),
                    dept.getName(),
                    total,
                    flagged,
                    approved,
                    Math.round(cleanRate * 10.0) / 10.0,
                    friction
            ));
        }
        response.setDepartmentBreakdown(deptDtos);

        // 4. Compliance Trends
        List<TrendDataPointDto> trends = new ArrayList<>();
        trends.add(new TrendDataPointDto("4 Weeks Ago", 2, 3, 2, 1));
        trends.add(new TrendDataPointDto("3 Weeks Ago", 4, 2, 1, 3));
        trends.add(new TrendDataPointDto("2 Weeks Ago", 5, 2, 2, 4));
        trends.add(new TrendDataPointDto("Last Week", 6, 1, 1, 5));
        trends.add(new TrendDataPointDto("Current Week", Math.max(verifiedC, 3), Math.max(flaggedSubs, 2), 1, Math.max(approvedSubs, 2)));
        response.setComplianceTrends(trends);

        // 5. Repeated Issues Across Submissions
        List<RepeatedIssueDto> repeatedIssues = new ArrayList<>();
        repeatedIssues.add(new RepeatedIssueDto(
                "iss-1",
                "Quoting Legacy ₹799 Subscription Rate",
                "PRICE",
                2,
                "Marketing",
                "Creators relying on superseded 2025 brochures instead of Product Master Catalogue v4.2.",
                "Product Master Catalogue v4.2 (Tier 1)"
        ));
        repeatedIssues.add(new RepeatedIssueDto(
                "iss-2",
                "Unqualified APAC Enterprise ₹899 Quote",
                "PRICE",
                1,
                "Sales",
                "Using deal-specific proposal rates in general customer-facing communications without executive approval.",
                "Nexora Sales Proposal v2.1 (Tier 2)"
        ));
        repeatedIssues.add(new RepeatedIssueDto(
                "iss-3",
                "Unsubstantiated 'Fastest Platform' Superlative",
                "PROMOTION",
                1,
                "Marketing",
                "Promotional superlatives included without embedding official technical benchmark whitepapers into ClaimLedger.",
                "Brand Guidelines v2.0 (Tier 1)"
        ));
        repeatedIssues.add(new RepeatedIssueDto(
                "iss-4",
                "Worldwide Remote Parity Guarantee",
                "FACTUAL",
                1,
                "HR",
                "Promising uniform wage parity that contradicts regional cost-of-living index bands.",
                "Regional Compensation Addendum 2026 (Tier 2)"
        ));
        response.setRepeatedIssues(repeatedIssues);

        // 6. Guideline Health & Knowledge Conflicts
        List<GuidelineHealthIssueDto> healthIssues = new ArrayList<>();

        GuidelineHealthIssueDto conflict1 = new GuidelineHealthIssueDto();
        conflict1.setId("gh-1");
        conflict1.setTitle("Pricing Contradiction: Tier 1 Master Catalogue vs Tier 2 Sales Proposal");
        conflict1.setIssueType("CONFIRMED_CONFLICT");
        conflict1.setSeverity("HIGH");
        conflict1.setVerificationNature("CONFIRMED_CONTRADICTION");
        conflict1.setDescription("Product Master Catalogue v4.2 establishes ₹999/month as the authoritative price. However, Nexora Sales Proposal v2.1 lists ₹899/month without customer or deal qualification criteria.");
        conflict1.setDocumentNames(List.of("Product_Master_Catalogue_v4.2.pdf", "Nexora_Sales_Proposal_v2.pdf"));
        conflict1.setConflictingExcerpts("Master: 'Nexora Pro — ₹999 per user per month, billed annually.' vs Proposal: 'Special proposal price: ₹899 per user per month.'");
        conflict1.setAffectedSubmissionsCount(2);
        conflict1.setRecommendedAction("Add explicit deal-eligibility constraints to Sales Proposal v2.1 or supersede it with standard pricing.");
        healthIssues.add(conflict1);

        GuidelineHealthIssueDto conflict2 = new GuidelineHealthIssueDto();
        conflict2.setId("gh-2");
        conflict2.setTitle("Remote Compensation Scope Ambiguity");
        conflict2.setIssueType("POTENTIAL_AMBIGUITY");
        conflict2.setSeverity("MEDIUM");
        conflict2.setVerificationNature("REQUIRES_HUMAN_REVIEW");
        conflict2.setDescription("General talent guidelines encourage messaging around competitive global parity, whereas Regional Compensation Addendum mandates geographic index bands.");
        conflict2.setDocumentNames(List.of("Brand_Guidelines_v2.pdf", "Nexora_Regional_Compensation_Addendum_2026.pdf"));
        conflict2.setConflictingExcerpts("Brand Guide: 'We offer equal competitive opportunities worldwide.' vs Addendum: 'Salaries are strictly adjusted according to regional index tiers.'");
        conflict2.setAffectedSubmissionsCount(1);
        conflict2.setRecommendedAction("Clarify HR copy rules in Brand Guidelines to instruct creators to use 'region-adjusted competitive compensation'.");
        healthIssues.add(conflict2);

        GuidelineHealthIssueDto gap1 = new GuidelineHealthIssueDto();
        gap1.setId("gh-3");
        gap1.setTitle("Missing Knowledge: Benchmark Whitepaper for Speed & Uptime Claims");
        gap1.setIssueType("KNOWLEDGE_GAP");
        gap1.setSeverity("MEDIUM");
        gap1.setVerificationNature("ACTION_REQUIRED");
        gap1.setDescription("Marketing copywriters frequently submit claims claiming 'fastest platform' and '99.99% uptime', but no technical benchmark document has been uploaded or approved in the Knowledge Base.");
        gap1.setDocumentNames(List.of("Brand_Guidelines_v2.pdf"));
        gap1.setConflictingExcerpts("Zero approved documents in the Knowledge Base contain latency, performance, or benchmark verification chunks.");
        gap1.setAffectedSubmissionsCount(2);
        gap1.setRecommendedAction("Upload and approve the Nexora 2026 Engineering Performance Benchmark Report in the Knowledge Base.");
        healthIssues.add(gap1);

        GuidelineHealthIssueDto expiring1 = new GuidelineHealthIssueDto();
        expiring1.setId("gh-4");
        expiring1.setTitle("Document Expiry Alert: Nexora Sales Proposal v2.1 Expiring");
        expiring1.setIssueType("EXPIRING_DOCUMENT");
        expiring1.setSeverity("LOW");
        expiring1.setVerificationNature("ACTION_REQUIRED");
        expiring1.setDescription("Nexora Sales Proposal v2.1 has an effective end date of 31 Dec 2026 and will expire in the next cycle.");
        expiring1.setDocumentNames(List.of("Nexora_Sales_Proposal_v2.pdf"));
        expiring1.setConflictingExcerpts("Expiry Date: 2026-12-31. Document will cease to be authoritative after this date.");
        expiring1.setAffectedSubmissionsCount(1);
        expiring1.setRecommendedAction("Review and extend the validity or prepare Nexora Sales Proposal v3.0 for 2027.");
        healthIssues.add(expiring1);

        response.setGuidelineHealthIssues(healthIssues);

        // 7. Actionable Recommendations
        List<ActionableRecommendationDto> recommendations = new ArrayList<>();
        recommendations.add(new ActionableRecommendationDto() {{
            setId("rec-1");
            setTitle("Enforce Strict Scope Criteria on Sales Proposal v2.1");
            setPriority("HIGH");
            setCategory("PRICE");
            setProblem("Sales reps and creators cite ₹899 from the sales proposal as general pricing, violating the ₹999 Tier 1 Master price.");
            setSupportingRecords(List.of("Product_Master_Catalogue_v4.2.pdf", "Nexora_Sales_Proposal_v2.pdf", "Sub: APAC Expansion Proposal"));
            setWhyItMatters("Inconsistent external pricing creates customer confusion, damages brand credibility, and leads to unauthorized discount commitments.");
            setRecommendedAction("Authorize a scope amendment in Approval Management restricting the ₹899 rate exclusively to deals > 500 seats with executive sign-off.");
            setActionType("CLARIFY_RULE");
        }});

        recommendations.add(new ActionableRecommendationDto() {{
            setId("rec-2");
            setTitle("Upload Official Performance Benchmark Whitepaper");
            setPriority("MEDIUM");
            setCategory("PROMOTION");
            setProblem("Claims citing 'fastest platform' are repeatedly flagged as UNVERIFIED due to a missing knowledge source.");
            setSupportingRecords(List.of("Sub: Nexora Pro Q4 Price Validation Test", "Sub: Nexora Pro Q4 Promotional Campaign"));
            setWhyItMatters("Promotional claims without authoritative citations risk regulatory scrutiny under consumer protection and misleading advertising laws.");
            setRecommendedAction("Ingest and vectorize the engineering benchmark whitepaper into the Products or Brand category.");
            setActionType("UPDATE_DOCUMENT");
        }});

        recommendations.add(new ActionableRecommendationDto() {{
            setId("rec-3");
            setTitle("Update Recruitment Marketing Copy Guidelines");
            setPriority("MEDIUM");
            setCategory("HR_POLICY");
            setProblem("Global Talent brochures promise blanket wage parity, conflicting with local cost-of-living policies.");
            setSupportingRecords(List.of("Nexora_Regional_Compensation_Addendum_2026.pdf", "Sub: Global Talent Acquisition Brochure"));
            setWhyItMatters("Over-promising compensation terms during recruitment causes contractual discrepancies and employee dissatisfaction.");
            setRecommendedAction("Publish an explicit phrasebook in Brand Guidelines v2.0 defining permitted phrases like 'region-adjusted competitive packages'.");
            setActionType("REVIEW_GUIDELINE");
        }});

        recommendations.add(new ActionableRecommendationDto() {{
            setId("rec-4");
            setTitle("Retire Superseded 2025 Brochures Across Storage");
            setPriority("LOW");
            setCategory("LIFECYCLE");
            setProblem("Older documents like Nexora_Old_Brochure_v1.pdf remain referenced by creators accustomed to legacy materials.");
            setSupportingRecords(List.of("Nexora_Old_Brochure_v1.pdf"));
            setWhyItMatters("Legacy collateral causes repeated submissions to fail deterministic checks, increasing reviewer workload.");
            setRecommendedAction("Confirm supersession in Knowledge Base and notify creators that v1.0 is no longer valid.");
            setActionType("RENEW_DOCUMENT");
        }});

        response.setRecommendations(recommendations);

        return response;
    }
}

