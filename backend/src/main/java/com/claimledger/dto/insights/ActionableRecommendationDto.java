package com.claimledger.dto.insights;

import java.util.ArrayList;
import java.util.List;

public class ActionableRecommendationDto {

    private String id;
    private String title;
    private String priority; // HIGH, MEDIUM, LOW
    private String category;
    private String problem;
    private List<String> supportingRecords = new ArrayList<>();
    private String whyItMatters;
    private String recommendedAction;
    private String actionType; // REVIEW_GUIDELINE, UPDATE_DOCUMENT, CLARIFY_RULE, RENEW_DOCUMENT

    public ActionableRecommendationDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getProblem() { return problem; }
    public void setProblem(String problem) { this.problem = problem; }

    public List<String> getSupportingRecords() { return supportingRecords; }
    public void setSupportingRecords(List<String> supportingRecords) { this.supportingRecords = supportingRecords; }

    public String getWhyItMatters() { return whyItMatters; }
    public void setWhyItMatters(String whyItMatters) { this.whyItMatters = whyItMatters; }

    public String getRecommendedAction() { return recommendedAction; }
    public void setRecommendedAction(String recommendedAction) { this.recommendedAction = recommendedAction; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }
}
