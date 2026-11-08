package com.claimledger.dto.review;

import com.claimledger.model.ReviewAction;
import com.claimledger.model.enums.ActionType;

import java.time.LocalDateTime;
import java.util.UUID;

public class ReviewActionResponse {

    private UUID id;
    private UUID submissionId;
    private UUID actorId;
    private String actorName;
    private String actorEmail;
    private String actorRole;
    private ActionType action;
    private String comment;
    private LocalDateTime createdAt;

    public ReviewActionResponse() {
    }

    public static ReviewActionResponse fromEntity(ReviewAction ra, String actorName, String actorEmail, String actorRole) {
        ReviewActionResponse response = new ReviewActionResponse();
        response.setId(ra.getId());
        response.setSubmissionId(ra.getSubmissionId());
        response.setActorId(ra.getActorId());
        response.setActorName(actorName);
        response.setActorEmail(actorEmail);
        response.setActorRole(actorRole);
        response.setAction(ra.getAction());
        response.setComment(ra.getComment());
        response.setCreatedAt(ra.getCreatedAt());
        return response;
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

    public UUID getActorId() {
        return actorId;
    }

    public void setActorId(UUID actorId) {
        this.actorId = actorId;
    }

    public String getActorName() {
        return actorName;
    }

    public void setActorName(String actorName) {
        this.actorName = actorName;
    }

    public String getActorEmail() {
        return actorEmail;
    }

    public void setActorEmail(String actorEmail) {
        this.actorEmail = actorEmail;
    }

    public String getActorRole() {
        return actorRole;
    }

    public void setActorRole(String actorRole) {
        this.actorRole = actorRole;
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
