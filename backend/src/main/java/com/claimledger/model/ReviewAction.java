package com.claimledger.model;

import com.claimledger.model.enums.ActionType;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "review_actions")
public class ReviewAction {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "submission_id")
    private UUID submissionId;

    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "actor_id", nullable = false)
    private UUID actorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false)
    private ActionType action;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public ReviewAction() {
    }

    public ReviewAction(UUID id, UUID submissionId, UUID actorId, ActionType action, String comment) {
        this.id = id != null ? id : UUID.randomUUID();
        this.submissionId = submissionId;
        this.actorId = actorId;
        this.action = action;
        this.comment = comment;
        this.createdAt = LocalDateTime.now();
    }

    public ReviewAction(UUID id, UUID submissionId, UUID documentId, UUID actorId, ActionType action, String comment) {
        this.id = id != null ? id : UUID.randomUUID();
        this.submissionId = submissionId;
        this.documentId = documentId;
        this.actorId = actorId;
        this.action = action;
        this.comment = comment;
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

    public UUID getDocumentId() {
        return documentId;
    }

    public void setDocumentId(UUID documentId) {
        this.documentId = documentId;
    }

    public UUID getActorId() {
        return actorId;
    }

    public void setActorId(UUID actorId) {
        this.actorId = actorId;
    }

    public ActionType getAction() {
        return action;
    }

    public void setAction(ActionType action) {
        this.action = action;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
