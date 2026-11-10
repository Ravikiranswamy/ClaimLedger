package com.claimledger.dto.submission;

import com.claimledger.model.Submission;
import com.claimledger.model.enums.ContentType;
import com.claimledger.model.enums.SubmissionStatus;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class SubmissionResponse {

    private UUID id;
    private String title;
    private String content;
    private String filePath;
    private String fileUrl;
    private ContentType contentType;
    private UUID departmentId;
    private String departmentName;
    private UUID submittedBy;
    private String submittedByName;
    private SubmissionStatus status;
    private int revisionNumber;
    private UUID parentSubmissionId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ClaimResponse> claims = new ArrayList<>();

    public SubmissionResponse() {
    }

    public static SubmissionResponse fromEntity(
            Submission submission,
            String departmentName,
            String submittedByName,
            List<ClaimResponse> claims
    ) {
        SubmissionResponse response = new SubmissionResponse();
        response.setId(submission.getId());
        response.setTitle(submission.getTitle());
        response.setContent(submission.getContent());
        response.setFilePath(submission.getFilePath());
        response.setFileUrl(submission.getFilePath() != null ? "/api/submissions/" + submission.getId() + "/file" : null);
        response.setContentType(submission.getContentType());
        response.setDepartmentId(submission.getDepartmentId());
        response.setDepartmentName(departmentName);
        response.setSubmittedBy(submission.getSubmittedBy());
        response.setSubmittedByName(submittedByName);
        response.setStatus(submission.getStatus());
        response.setRevisionNumber(submission.getRevisionNumber());
        response.setParentSubmissionId(submission.getParentSubmissionId());
        response.setCreatedAt(submission.getCreatedAt());
        response.setUpdatedAt(submission.getUpdatedAt());
        response.setClaims(claims != null ? claims : new ArrayList<>());
        return response;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getFileUrl() {
        return fileUrl != null ? fileUrl : (filePath != null && id != null ? "/api/submissions/" + id + "/file" : null);
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    public ContentType getContentType() {
        return contentType;
    }

    public void setContentType(ContentType contentType) {
        this.contentType = contentType;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public String getDepartmentName() {
        return departmentName;
    }

    public void setDepartmentName(String departmentName) {
        this.departmentName = departmentName;
    }

    public UUID getSubmittedBy() {
        return submittedBy;
    }

    public void setSubmittedBy(UUID submittedBy) {
        this.submittedBy = submittedBy;
    }

    public String getSubmittedByName() {
        return submittedByName;
    }

    public void setSubmittedByName(String submittedByName) {
        this.submittedByName = submittedByName;
    }

    public String getDepartment() {
        if (departmentName != null) {
            return departmentName.toUpperCase();
        }
        return "MARKETING";
    }

    public String getText() {
        return content;
    }

    public String getFileName() {
        return filePath != null ? filePath.substring(filePath.lastIndexOf("/") + 1) : null;
    }

    public String getCreatedBy() {
        return submittedByName != null ? submittedByName : (submittedBy != null ? submittedBy.toString() : "Creator");
    }

    public SubmissionStatus getStatus() {
        return status;
    }

    public void setStatus(SubmissionStatus status) {
        this.status = status;
    }

    public int getRevisionNumber() {
        return revisionNumber;
    }

    public void setRevisionNumber(int revisionNumber) {
        this.revisionNumber = revisionNumber;
    }

    public UUID getParentSubmissionId() {
        return parentSubmissionId;
    }

    public void setParentSubmissionId(UUID parentSubmissionId) {
        this.parentSubmissionId = parentSubmissionId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<ClaimResponse> getClaims() {
        return claims;
    }

    public void setClaims(List<ClaimResponse> claims) {
        this.claims = claims;
    }
}
