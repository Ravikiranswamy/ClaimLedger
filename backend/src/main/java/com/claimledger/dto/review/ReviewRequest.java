package com.claimledger.dto.review;

import com.claimledger.model.enums.ActionType;
import jakarta.validation.constraints.NotNull;

public class ReviewRequest {

    @NotNull(message = "Review action is required (REVIEWER_APPROVED, REVIEWER_CHANGES_REQUESTED, or REVIEWER_REJECTED)")
    private ActionType action;

    private String comment;

    public ReviewRequest() {
    }

    public ReviewRequest(ActionType action, String comment) {
        this.action = action;
        this.comment = comment;
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
}
