package com.claimledger.dto.insights;

public class GovernanceOverviewDto {

    private long totalSubmissions;
    private long flaggedSubmissions;
    private long approvedSubmissions;
    private long totalClaims;
    private long verifiedClaims;
    private long violationClaims;
    private long unverifiedClaims;
    private long conflictClaims;
    private double complianceRate;
    private long activeDocuments;
    private long expiredDocuments;
    private long expiringSoonDocuments;

    public GovernanceOverviewDto() {}

    public long getTotalSubmissions() { return totalSubmissions; }
    public void setTotalSubmissions(long totalSubmissions) { this.totalSubmissions = totalSubmissions; }

    public long getFlaggedSubmissions() { return flaggedSubmissions; }
    public void setFlaggedSubmissions(long flaggedSubmissions) { this.flaggedSubmissions = flaggedSubmissions; }

    public long getApprovedSubmissions() { return approvedSubmissions; }
    public void setApprovedSubmissions(long approvedSubmissions) { this.approvedSubmissions = approvedSubmissions; }

    public long getTotalClaims() { return totalClaims; }
    public void setTotalClaims(long totalClaims) { this.totalClaims = totalClaims; }

    public long getVerifiedClaims() { return verifiedClaims; }
    public void setVerifiedClaims(long verifiedClaims) { this.verifiedClaims = verifiedClaims; }

    public long getViolationClaims() { return violationClaims; }
    public void setViolationClaims(long violationClaims) { this.violationClaims = violationClaims; }

    public long getUnverifiedClaims() { return unverifiedClaims; }
    public void setUnverifiedClaims(long unverifiedClaims) { this.unverifiedClaims = unverifiedClaims; }

    public long getConflictClaims() { return conflictClaims; }
    public void setConflictClaims(long conflictClaims) { this.conflictClaims = conflictClaims; }

    public double getComplianceRate() { return complianceRate; }
    public void setComplianceRate(double complianceRate) { this.complianceRate = complianceRate; }

    public long getActiveDocuments() { return activeDocuments; }
    public void setActiveDocuments(long activeDocuments) { this.activeDocuments = activeDocuments; }

    public long getExpiredDocuments() { return expiredDocuments; }
    public void setExpiredDocuments(long expiredDocuments) { this.expiredDocuments = expiredDocuments; }

    public long getExpiringSoonDocuments() { return expiringSoonDocuments; }
    public void setExpiringSoonDocuments(long expiringSoonDocuments) { this.expiringSoonDocuments = expiringSoonDocuments; }
}

