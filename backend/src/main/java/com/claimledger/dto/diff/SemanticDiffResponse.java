package com.claimledger.dto.diff;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class SemanticDiffResponse {
    private UUID submissionId;
    private int fromRevision;
    private int toRevision;
    private String fromContent;
    private String toContent;
    private String fromCreatorNotes;
    private String toCreatorNotes;
    private List<TextDiffChunk> textDiff = new ArrayList<>();
    private List<ClaimAttributeDiff> claimDiffs = new ArrayList<>();
    private int totalClaimsChanged;
    private boolean reverificationRequired;
    private String diffSummary;

    public SemanticDiffResponse() {}

    public UUID getSubmissionId() {
        return submissionId;
    }

    public void setSubmissionId(UUID submissionId) {
        this.submissionId = submissionId;
    }

    public int getFromRevision() {
        return fromRevision;
    }

    public void setFromRevision(int fromRevision) {
        this.fromRevision = fromRevision;
    }

    public int getToRevision() {
        return toRevision;
    }

    public void setToRevision(int toRevision) {
        this.toRevision = toRevision;
    }

    public String getFromContent() {
        return fromContent;
    }

    public void setFromContent(String fromContent) {
        this.fromContent = fromContent;
    }

    public String getToContent() {
        return toContent;
    }

    public void setToContent(String toContent) {
        this.toContent = toContent;
    }

    public String getFromCreatorNotes() {
        return fromCreatorNotes;
    }

    public void setFromCreatorNotes(String fromCreatorNotes) {
        this.fromCreatorNotes = fromCreatorNotes;
    }

    public String getToCreatorNotes() {
        return toCreatorNotes;
    }

    public void setToCreatorNotes(String toCreatorNotes) {
        this.toCreatorNotes = toCreatorNotes;
    }

    public List<TextDiffChunk> getTextDiff() {
        return textDiff;
    }

    public void setTextDiff(List<TextDiffChunk> textDiff) {
        this.textDiff = textDiff;
    }

    public List<ClaimAttributeDiff> getClaimDiffs() {
        return claimDiffs;
    }

    public void setClaimDiffs(List<ClaimAttributeDiff> claimDiffs) {
        this.claimDiffs = claimDiffs;
    }

    public int getTotalClaimsChanged() {
        return totalClaimsChanged;
    }

    public void setTotalClaimsChanged(int totalClaimsChanged) {
        this.totalClaimsChanged = totalClaimsChanged;
    }

    public boolean isReverificationRequired() {
        return reverificationRequired;
    }

    public void setReverificationRequired(boolean reverificationRequired) {
        this.reverificationRequired = reverificationRequired;
    }

    public String getDiffSummary() {
        return diffSummary;
    }

    public void setDiffSummary(String diffSummary) {
        this.diffSummary = diffSummary;
    }
}

