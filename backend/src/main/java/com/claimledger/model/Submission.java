package com.claimledger.model;

import com.claimledger.model.enums.ContentType;
import com.claimledger.model.enums.SubmissionStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "submissions")
public class Submission {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "file_path")
    private String filePath;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false)
    private ContentType contentType;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "organisation_id")
    private UUID organisationId;

    @Column(name = "submitted_by", nullable = false)
    private UUID submittedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SubmissionStatus status;

    @Column(name = "revision_number", nullable = false)
    private int revisionNumber = 1;

    @Column(name = "parent_submission_id")
    private UUID parentSubmissionId;

    @Column(name = "total_claims")
    private Integer totalClaims = 0;

    @Column(name = "verified_claims")
    private Integer verifiedClaims = 0;

    @Column(name = "violation_claims")
    private Integer violationClaims = 0;

    @Column(name = "unverified_claims")
    private Integer unverifiedClaims = 0;

    @Column(name = "conflict_claims")
    private Integer conflictClaims = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Submission() {
    }

    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
        if (this.revisionNumber == 0) {
            this.revisionNumber = 1;
        }
        if (this.totalClaims == null) this.totalClaims = 0;
        if (this.verifiedClaims == null) this.verifiedClaims = 0;
        if (this.violationClaims == null) this.violationClaims = 0;
        if (this.unverifiedClaims == null) this.unverifiedClaims = 0;
        if (this.conflictClaims == null) this.conflictClaims = 0;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
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

    public UUID getOrganisationId() {
        return organisationId;
    }

    public void setOrganisationId(UUID organisationId) {
        this.organisationId = organisationId;
    }

    public UUID getSubmittedBy() {
        return submittedBy;
    }

    public void setSubmittedBy(UUID submittedBy) {
        this.submittedBy = submittedBy;
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

    public Integer getTotalClaims() {
        return totalClaims;
    }

    public void setTotalClaims(Integer totalClaims) {
        this.totalClaims = totalClaims;
    }

    public Integer getVerifiedClaims() {
        return verifiedClaims;
    }

    public void setVerifiedClaims(Integer verifiedClaims) {
        this.verifiedClaims = verifiedClaims;
    }

    public Integer getViolationClaims() {
        return violationClaims;
    }

    public void setViolationClaims(Integer violationClaims) {
        this.violationClaims = violationClaims;
    }

    public Integer getUnverifiedClaims() {
        return unverifiedClaims;
    }

    public void setUnverifiedClaims(Integer unverifiedClaims) {
        this.unverifiedClaims = unverifiedClaims;
    }

    public Integer getConflictClaims() {
        return conflictClaims;
    }

    public void setConflictClaims(Integer conflictClaims) {
        this.conflictClaims = conflictClaims;
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
}
