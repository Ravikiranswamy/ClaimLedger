package com.claimledger.dto.diff;

public class ClaimAttributeDiff {
    private String product;
    private String attributeType;
    private String attributeName;
    private String previousValue;
    private String newValue;
    private String unit;
    private String billingPeriod;
    private String changeType; // "MODIFIED", "ADDED", "REMOVED", "UNCHANGED"
    private boolean reverificationRequired;
    private String severity;   // "HIGH", "MEDIUM", "LOW"
    private String summary;
    private String previousStatus;
    private String newStatus;

    public ClaimAttributeDiff() {}

    public ClaimAttributeDiff(String product, String attributeType, String attributeName,
                              String previousValue, String newValue, String unit, String billingPeriod,
                              String changeType, boolean reverificationRequired, String severity,
                              String summary, String previousStatus, String newStatus) {
        this.product = product;
        this.attributeType = attributeType;
        this.attributeName = attributeName;
        this.previousValue = previousValue;
        this.newValue = newValue;
        this.unit = unit;
        this.billingPeriod = billingPeriod;
        this.changeType = changeType;
        this.reverificationRequired = reverificationRequired;
        this.severity = severity;
        this.summary = summary;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
    }

    public String getProduct() {
        return product;
    }

    public void setProduct(String product) {
        this.product = product;
    }

    public String getAttributeType() {
        return attributeType;
    }

    public void setAttributeType(String attributeType) {
        this.attributeType = attributeType;
    }

    public String getAttributeName() {
        return attributeName;
    }

    public void setAttributeName(String attributeName) {
        this.attributeName = attributeName;
    }

    public String getPreviousValue() {
        return previousValue;
    }

    public void setPreviousValue(String previousValue) {
        this.previousValue = previousValue;
    }

    public String getNewValue() {
        return newValue;
    }

    public void setNewValue(String newValue) {
        this.newValue = newValue;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public String getBillingPeriod() {
        return billingPeriod;
    }

    public void setBillingPeriod(String billingPeriod) {
        this.billingPeriod = billingPeriod;
    }

    public String getChangeType() {
        return changeType;
    }

    public void setChangeType(String changeType) {
        this.changeType = changeType;
    }

    public boolean isReverificationRequired() {
        return reverificationRequired;
    }

    public void setReverificationRequired(boolean reverificationRequired) {
        this.reverificationRequired = reverificationRequired;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getPreviousStatus() {
        return previousStatus;
    }

    public void setPreviousStatus(String previousStatus) {
        this.previousStatus = previousStatus;
    }

    public String getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(String newStatus) {
        this.newStatus = newStatus;
    }
}

