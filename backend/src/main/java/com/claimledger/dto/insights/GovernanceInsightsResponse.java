package com.claimledger.dto.insights;

import java.util.ArrayList;
import java.util.List;

public class GovernanceInsightsResponse {

    private GovernanceOverviewDto overview;
    private List<ViolationCategoryDto> violationCategories = new ArrayList<>();
    private List<DepartmentComplianceDto> departmentBreakdown = new ArrayList<>();
    private List<TrendDataPointDto> complianceTrends = new ArrayList<>();
    private List<RepeatedIssueDto> repeatedIssues = new ArrayList<>();
    private List<GuidelineHealthIssueDto> guidelineHealthIssues = new ArrayList<>();
    private List<ActionableRecommendationDto> recommendations = new ArrayList<>();

    public GovernanceInsightsResponse() {}

    public GovernanceOverviewDto getOverview() { return overview; }
    public void setOverview(GovernanceOverviewDto overview) { this.overview = overview; }

    public List<ViolationCategoryDto> getViolationCategories() { return violationCategories; }
    public void setViolationCategories(List<ViolationCategoryDto> violationCategories) { this.violationCategories = violationCategories; }

    public List<DepartmentComplianceDto> getDepartmentBreakdown() { return departmentBreakdown; }
    public void setDepartmentBreakdown(List<DepartmentComplianceDto> departmentBreakdown) { this.departmentBreakdown = departmentBreakdown; }

    public List<TrendDataPointDto> getComplianceTrends() { return complianceTrends; }
    public void setComplianceTrends(List<TrendDataPointDto> complianceTrends) { this.complianceTrends = complianceTrends; }

    public List<RepeatedIssueDto> getRepeatedIssues() { return repeatedIssues; }
    public void setRepeatedIssues(List<RepeatedIssueDto> repeatedIssues) { this.repeatedIssues = repeatedIssues; }

    public List<GuidelineHealthIssueDto> getGuidelineHealthIssues() { return guidelineHealthIssues; }
    public void setGuidelineHealthIssues(List<GuidelineHealthIssueDto> guidelineHealthIssues) { this.guidelineHealthIssues = guidelineHealthIssues; }

    public List<ActionableRecommendationDto> getRecommendations() { return recommendations; }
    public void setRecommendations(List<ActionableRecommendationDto> recommendations) { this.recommendations = recommendations; }
}

