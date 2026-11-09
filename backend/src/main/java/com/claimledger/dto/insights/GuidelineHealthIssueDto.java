package com.claimledger.dto.insights;

import java.util.ArrayList;
import java.util.List;

public class GuidelineHealthIssueDto {

    private String id;
    private String title;
    private String issueType; // CONFIRMED_CONFLICT, POTENTIAL_AMBIGUITY, KNOWLEDGE_GAP, EXPIRING_DOCUMENT, OVERLAPPING_RULES
    private String severity; // CRITICAL, HIGH, MEDIUM, LOW
    private String verificationNature; // CONFIRMED_CONTRADICTION, REQUIRES_HUMAN_REVIEW, ACTION_REQUIRED
    private String description;
    private List<String> documentNames = new ArrayList<>();
    private List<String> documentIds = new ArrayList<>();
    private String conflictingExcerpts;
    private long affectedSubmissionsCount;
    private String recommendedAction;

    public GuidelineHealthIssueDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getIssueType() { return issueType; }
    public void setIssueType(String issueType) { this.issueType = issueType; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getVerificationNature() { return verificationNature; }
    public void setVerificationNature(String verificationNature) { this.verificationNature = verificationNature; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getDocumentNames() { return documentNames; }
    public void setDocumentNames(List<String> documentNames) { this.documentNames = documentNames; }

    public List<String> getDocumentIds() { return documentIds; }
    public void setDocumentIds(List<String> documentIds) { this.documentIds = documentIds; }

    public String getConflictingExcerpts() { return conflictingExcerpts; }
    public void setConflictingExcerpts(String conflictingExcerpts) { this.conflictingExcerpts = conflictingExcerpts; }

    public long getAffectedSubmissionsCount() { return affectedSubmissionsCount; }
    public void setAffectedSubmissionsCount(long affectedSubmissionsCount) { this.affectedSubmissionsCount = affectedSubmissionsCount; }

    public String getRecommendedAction() { return recommendedAction; }
    public void setRecommendedAction(String recommendedAction) { this.recommendedAction = recommendedAction; }
}

