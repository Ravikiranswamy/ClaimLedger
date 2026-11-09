package com.claimledger.dto.insights;

public class TrendDataPointDto {

    private String period;
    private long verified;
    private long flagged;
    private long changesRequested;
    private long approved;

    public TrendDataPointDto() {}

    public TrendDataPointDto(String period, long verified, long flagged, long changesRequested, long approved) {
        this.period = period;
        this.verified = verified;
        this.flagged = flagged;
        this.changesRequested = changesRequested;
        this.approved = approved;
    }

    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }

    public long getVerified() { return verified; }
    public void setVerified(long verified) { this.verified = verified; }

    public long getFlagged() { return flagged; }
    public void setFlagged(long flagged) { this.flagged = flagged; }

    public long getChangesRequested() { return changesRequested; }
    public void setChangesRequested(long changesRequested) { this.changesRequested = changesRequested; }

    public long getApproved() { return approved; }
    public void setApproved(long approved) { this.approved = approved; }
}

