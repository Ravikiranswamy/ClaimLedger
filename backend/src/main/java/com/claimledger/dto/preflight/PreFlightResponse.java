package com.claimledger.dto.preflight;

import com.claimledger.model.enums.ClaimType;
import com.claimledger.model.enums.VerificationStatus;

import java.util.List;

public class PreFlightResponse {

    private String mode;
    private long latencyMs;
    private int totalClaims;
    private int violations;
    private int verified;
    private int conflicts;
    private int unverified;
    private boolean compliant;
    private String summary;
    private List<PreFlightClaimResult> claims;

    public PreFlightResponse() {}

    public static class PreFlightClaimResult {
        private String claimText;
        private ClaimType claimType;
        private VerificationStatus status;
        private String explanation;
        private String suggestedCorrection;
        private String authoritativeSource;

        public PreFlightClaimResult() {}

        public PreFlightClaimResult(String claimText, ClaimType claimType, VerificationStatus status,
                                    String explanation, String suggestedCorrection, String authoritativeSource) {
            this.claimText = claimText;
            this.claimType = claimType;
            this.status = status;
            this.explanation = explanation;
            this.suggestedCorrection = suggestedCorrection;
            this.authoritativeSource = authoritativeSource;
        }

        public String getClaimText() {
            return claimText;
        }

        public void setClaimText(String claimText) {
            this.claimText = claimText;
        }

        public ClaimType getClaimType() {
            return claimType;
        }

        public void setClaimType(ClaimType claimType) {
            this.claimType = claimType;
        }

        public VerificationStatus getStatus() {
            return status;
        }

        public void setStatus(VerificationStatus status) {
            this.status = status;
        }

        public String getExplanation() {
            return explanation;
        }

        public void setExplanation(String explanation) {
            this.explanation = explanation;
        }

        public String getSuggestedCorrection() {
            return suggestedCorrection;
        }

        public void setSuggestedCorrection(String suggestedCorrection) {
            this.suggestedCorrection = suggestedCorrection;
        }

        public String getAuthoritativeSource() {
            return authoritativeSource;
        }

        public void setAuthoritativeSource(String authoritativeSource) {
            this.authoritativeSource = authoritativeSource;
        }
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public long getLatencyMs() {
        return latencyMs;
    }

    public void setLatencyMs(long latencyMs) {
        this.latencyMs = latencyMs;
    }

    public int getTotalClaims() {
        return totalClaims;
    }

    public void setTotalClaims(int totalClaims) {
        this.totalClaims = totalClaims;
    }

    public int getViolations() {
        return violations;
    }

    public void setViolations(int violations) {
        this.violations = violations;
    }

    public int getVerified() {
        return verified;
    }

    public void setVerified(int verified) {
        this.verified = verified;
    }

    public int getConflicts() {
        return conflicts;
    }

    public void setConflicts(int conflicts) {
        this.conflicts = conflicts;
    }

    public int getUnverified() {
        return unverified;
    }

    public void setUnverified(int unverified) {
        this.unverified = unverified;
    }

    public boolean isCompliant() {
        return compliant;
    }

    public void setCompliant(boolean compliant) {
        this.compliant = compliant;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<PreFlightClaimResult> getClaims() {
        return claims;
    }

    public void setClaims(List<PreFlightClaimResult> claims) {
        this.claims = claims;
    }
}

