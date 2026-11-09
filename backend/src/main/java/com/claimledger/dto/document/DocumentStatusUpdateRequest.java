package com.claimledger.dto.document;

import com.claimledger.model.enums.ApprovalStatus;
import jakarta.validation.constraints.NotNull;

public class DocumentStatusUpdateRequest {

    @NotNull(message = "Approval status is required")
    private ApprovalStatus approvalStatus;

    private String reason;

    public DocumentStatusUpdateRequest() {
    }

    public DocumentStatusUpdateRequest(ApprovalStatus approvalStatus) {
        this.approvalStatus = approvalStatus;
    }

    public DocumentStatusUpdateRequest(ApprovalStatus approvalStatus, String reason) {
        this.approvalStatus = approvalStatus;
        this.reason = reason;
    }

    public ApprovalStatus getApprovalStatus() {
        return approvalStatus;
    }

    public void setApprovalStatus(ApprovalStatus approvalStatus) {
        this.approvalStatus = approvalStatus;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
