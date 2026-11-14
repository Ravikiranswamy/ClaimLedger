package com.claimledger.model;

import com.claimledger.model.enums.ContentType;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "submission_revisions")
public class SubmissionRevision {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "submission_id", nullable = false)
    private UUID submissionId;

    @Column(name = "revision_number", nullable = false)
    private int revisionNumber;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "creator_notes", columnDefinition = "TEXT")
    private String creatorNotes;

    @Column(name = "file_path")
    private String filePath;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false)
    private ContentType contentType;

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

    @Column(name = "revision_comment", columnDefinition = "TEXT")
    private String revisionComment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public SubmissionRevision() {
    }

    public SubmissionRevision(
            UUID submissionId,
            int revisionNumber,
            String content,
            String creatorNotes,
            String filePath,
            ContentType contentType,
            Integer totalClaims,
            Integer verifiedClaims,
            Integer violationClaims,
            Integer unverifiedClaims,
            Integer conflictClaims,
            String revisionComment
    ) {
        this.id = UUID.randomUUID();
        this.submissionId = submissionId;
        this.revisionNumber = revisionNumber;
        this.content = content;
        this.creatorNotes = creatorNotes;
        this.filePath = filePath;
        this.contentType = contentType;
        this.totalClaims = totalClaims != null ? totalClaims : 0;
        this.verifiedClaims = verifiedClaims != null ? verifiedClaims : 0;
        this.violationClaims = violationClaims != null ? violationClaims : 0;
        this.unverifiedClaims = unverifiedClaims != null ? unverifiedClaims : 0;
        this.conflictClaims = conflictClaims != null ? conflictClaims : 0;
        this.revisionComment = revisionComment;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getSubmissionId() {
        return submissionId;
    }

    public void setSubmissionId(UUID submissionId) {
        this.submissionId = submissionId;
    }

    public int getRevisionNumber() {
        return revisionNumber;
    }

    public void setRevisionNumber(int revisionNumber) {
        this.revisionNumber = revisionNumber;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getCreatorNotes() {
        return creatorNotes;
    }

    public void setCreatorNotes(String creatorNotes) {
        this.creatorNotes = creatorNotes;
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

    public String getRevisionComment() {
        return revisionComment;
    }

    public void setRevisionComment(String revisionComment) {
        this.revisionComment = revisionComment;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

