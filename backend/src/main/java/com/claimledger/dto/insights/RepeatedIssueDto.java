package com.claimledger.dto.insights;

public class RepeatedIssueDto {

    private String id;
    private String issueTitle;
    private String category;
    private long occurrenceCount;
    private String affectedDepartment;
    private String rootCause;
    private String ruleReference;

    public RepeatedIssueDto() {}

    public RepeatedIssueDto(String id, String issueTitle, String category, long occurrenceCount, String affectedDepartment, String rootCause, String ruleReference) {
        this.id = id;
        this.issueTitle = issueTitle;
        this.category = category;
        this.occurrenceCount = occurrenceCount;
        this.affectedDepartment = affectedDepartment;
        this.rootCause = rootCause;
        this.ruleReference = ruleReference;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getIssueTitle() { return issueTitle; }
    public void setIssueTitle(String issueTitle) { this.issueTitle = issueTitle; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public long getOccurrenceCount() { return occurrenceCount; }
    public void setOccurrenceCount(long occurrenceCount) { this.occurrenceCount = occurrenceCount; }

    public String getAffectedDepartment() { return affectedDepartment; }
    public void setAffectedDepartment(String affectedDepartment) { this.affectedDepartment = affectedDepartment; }

    public String getRootCause() { return rootCause; }
    public void setRootCause(String rootCause) { this.rootCause = rootCause; }

    public String getRuleReference() { return ruleReference; }
    public void setRuleReference(String ruleReference) { this.ruleReference = ruleReference; }
}

