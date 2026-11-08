package com.claimledger.dto.submission;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class FindingDto {

    private UUID id;
    private String claimText;
    private int[] span = new int[]{0, 0};
    private String state; // VERIFIED, VIOLATION, UNVERIFIED, CONFLICT
    private String message;
    private AuthorityDto authority;
    private String suggestedFix;

    public FindingDto() {
    }

    public static class SourceDto {
        private UUID id;
        private String name;
        private String version;
        private String status;
        private String effectiveFrom;
        private String effectiveTo;

        public SourceDto() {}

        public SourceDto(UUID id, String name, String version, String status, String effectiveFrom, String effectiveTo) {
            this.id = id;
            this.name = name;
            this.version = version;
            this.status = status;
            this.effectiveFrom = effectiveFrom;
            this.effectiveTo = effectiveTo;
        }

        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getEffectiveFrom() { return effectiveFrom; }
        public void setEffectiveFrom(String effectiveFrom) { this.effectiveFrom = effectiveFrom; }
        public String getEffectiveTo() { return effectiveTo; }
        public void setEffectiveTo(String effectiveTo) { this.effectiveTo = effectiveTo; }
    }

    public static class AuthorityConsiderationDto {
        private SourceDto source;
        private String outcome; // SUPERSEDED, SCOPED, AUTHORITATIVE, TIE, NOT_APPLICABLE
        private String value;
        private String reason;

        public AuthorityConsiderationDto() {}

        public AuthorityConsiderationDto(SourceDto source, String outcome, String value, String reason) {
            this.source = source;
            this.outcome = outcome;
            this.value = value;
            this.reason = reason;
        }

        public SourceDto getSource() { return source; }
        public void setSource(SourceDto source) { this.source = source; }
        public String getOutcome() { return outcome; }
        public void setOutcome(String outcome) { this.outcome = outcome; }
        public String getValue() { return value; }
        public void setValue(String value) { this.value = value; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class AuthorityDto {
        private SourceDto winner;
        private String approvedValue;
        private List<AuthorityConsiderationDto> considered = new ArrayList<>();

        public AuthorityDto() {}

        public AuthorityDto(SourceDto winner, String approvedValue, List<AuthorityConsiderationDto> considered) {
            this.winner = winner;
            this.approvedValue = approvedValue;
            this.considered = considered != null ? considered : new ArrayList<>();
        }

        public SourceDto getWinner() { return winner; }
        public void setWinner(SourceDto winner) { this.winner = winner; }
        public String getApprovedValue() { return approvedValue; }
        public void setApprovedValue(String approvedValue) { this.approvedValue = approvedValue; }
        public List<AuthorityConsiderationDto> getConsidered() { return considered; }
        public void setConsidered(List<AuthorityConsiderationDto> considered) { this.considered = considered; }
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getClaimText() { return claimText; }
    public void setClaimText(String claimText) { this.claimText = claimText; }
    public int[] getSpan() { return span; }
    public void setSpan(int[] span) { this.span = span; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public AuthorityDto getAuthority() { return authority; }
    public void setAuthority(AuthorityDto authority) { this.authority = authority; }
    public String getSuggestedFix() { return suggestedFix; }
    public void setSuggestedFix(String suggestedFix) { this.suggestedFix = suggestedFix; }
}
