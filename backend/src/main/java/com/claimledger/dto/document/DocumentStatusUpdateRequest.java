package com.claimledger.dto.document;

import com.claimledger.model.enums.ApprovalStatus;
import jakarta.validation.constraints.NotNull;

public class DocumentStatusUpdateRequest {

    @NotNull(message = "Approval status is required")
    private ApprovalStatus approvalStatus;

    public DocumentStatusUpdateRequest() {
    }

    public DocumentStatusUpdateRequest(ApprovalStatus approvalStatus) {
        this.approvalStatus = approvalStatus;
    }

    public ApprovalStatus getApprovalStatus() {
        return approvalStatus;
    }

    public void setApprovalStatus(ApprovalStatus approvalStatus) {
        this.approvalStatus = approvalStatus;
    }
}
