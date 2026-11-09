package com.claimledger.dto.insights;

import java.util.UUID;

public class DepartmentComplianceDto {

    private UUID departmentId;
    private String departmentName;
    private long totalSubmissions;
    private long flaggedSubmissions;
    private long approvedSubmissions;
    private double cleanRate;
    private String primaryFrictionPoint;

    public DepartmentComplianceDto() {}

    public DepartmentComplianceDto(UUID departmentId, String departmentName, long totalSubmissions, long flaggedSubmissions, long approvedSubmissions, double cleanRate, String primaryFrictionPoint) {
        this.departmentId = departmentId;
        this.departmentName = departmentName;
        this.totalSubmissions = totalSubmissions;
        this.flaggedSubmissions = flaggedSubmissions;
        this.approvedSubmissions = approvedSubmissions;
        this.cleanRate = cleanRate;
        this.primaryFrictionPoint = primaryFrictionPoint;
    }

    public UUID getDepartmentId() { return departmentId; }
    public void setDepartmentId(UUID departmentId) { this.departmentId = departmentId; }

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }

    public long getTotalSubmissions() { return totalSubmissions; }
    public void setTotalSubmissions(long totalSubmissions) { this.totalSubmissions = totalSubmissions; }

    public long getFlaggedSubmissions() { return flaggedSubmissions; }
    public void setFlaggedSubmissions(long flaggedSubmissions) { this.flaggedSubmissions = flaggedSubmissions; }

    public long getApprovedSubmissions() { return approvedSubmissions; }
    public void setApprovedSubmissions(long approvedSubmissions) { this.approvedSubmissions = approvedSubmissions; }

    public double getCleanRate() { return cleanRate; }
    public void setCleanRate(double cleanRate) { this.cleanRate = cleanRate; }

    public String getPrimaryFrictionPoint() { return primaryFrictionPoint; }
    public void setPrimaryFrictionPoint(String primaryFrictionPoint) { this.primaryFrictionPoint = primaryFrictionPoint; }
}
