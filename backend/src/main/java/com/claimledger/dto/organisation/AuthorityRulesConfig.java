package com.claimledger.dto.organisation;

public class AuthorityRulesConfig {
    private boolean requireExplicitApproval = true;
    private boolean strictDateValidity = true;
    private boolean allowScopedTier2Exceptions = true;
    private boolean tier1OverridesSubordinate = true;
    private boolean flagNumericContradictions = true;

    public AuthorityRulesConfig() {
    }

    public AuthorityRulesConfig(boolean requireExplicitApproval, boolean strictDateValidity, boolean allowScopedTier2Exceptions, boolean tier1OverridesSubordinate, boolean flagNumericContradictions) {
        this.requireExplicitApproval = requireExplicitApproval;
        this.strictDateValidity = strictDateValidity;
        this.allowScopedTier2Exceptions = allowScopedTier2Exceptions;
        this.tier1OverridesSubordinate = tier1OverridesSubordinate;
        this.flagNumericContradictions = flagNumericContradictions;
    }

    public boolean isRequireExplicitApproval() {
        return requireExplicitApproval;
    }

    public void setRequireExplicitApproval(boolean requireExplicitApproval) {
        this.requireExplicitApproval = requireExplicitApproval;
    }

    public boolean isStrictDateValidity() {
        return strictDateValidity;
    }

    public void setStrictDateValidity(boolean strictDateValidity) {
        this.strictDateValidity = strictDateValidity;
    }

    public boolean isAllowScopedTier2Exceptions() {
        return allowScopedTier2Exceptions;
    }

    public void setAllowScopedTier2Exceptions(boolean allowScopedTier2Exceptions) {
        this.allowScopedTier2Exceptions = allowScopedTier2Exceptions;
    }

    public boolean isTier1OverridesSubordinate() {
        return tier1OverridesSubordinate;
    }

    public void setTier1OverridesSubordinate(boolean tier1OverridesSubordinate) {
        this.tier1OverridesSubordinate = tier1OverridesSubordinate;
    }

    public boolean isFlagNumericContradictions() {
        return flagNumericContradictions;
    }

    public void setFlagNumericContradictions(boolean flagNumericContradictions) {
        this.flagNumericContradictions = flagNumericContradictions;
    }
}

