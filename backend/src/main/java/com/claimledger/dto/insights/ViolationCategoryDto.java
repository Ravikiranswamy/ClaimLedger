package com.claimledger.dto.insights;

public class ViolationCategoryDto {

    private String category;
    private String label;
    private long count;
    private double percentage;
    private String severity;
    private String description;
    private String sampleClaim;

    public ViolationCategoryDto() {}

    public ViolationCategoryDto(String category, String label, long count, double percentage, String severity, String description, String sampleClaim) {
        this.category = category;
        this.label = label;
        this.count = count;
        this.percentage = percentage;
        this.severity = severity;
        this.description = description;
        this.sampleClaim = sampleClaim;
    }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }

    public double getPercentage() { return percentage; }
    public void setPercentage(double percentage) { this.percentage = percentage; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSampleClaim() { return sampleClaim; }
    public void setSampleClaim(String sampleClaim) { this.sampleClaim = sampleClaim; }
}
