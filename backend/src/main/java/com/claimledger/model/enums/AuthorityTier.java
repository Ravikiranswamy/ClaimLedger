package com.claimledger.model.enums;

public enum AuthorityTier {
    TIER_1(1),
    TIER_2(2),
    TIER_3(3);

    private final int rank;

    AuthorityTier(int rank) {
        this.rank = rank;
    }

    public int getRank() {
        return rank;
    }

    /**
     * Returns true if this tier has higher authority than the other tier.
     * TIER_1 (rank 1) > TIER_2 (rank 2) > TIER_3 (rank 3).
     */
    public boolean isHigherThan(AuthorityTier other) {
        if (other == null) {
            return true;
        }
        return this.rank < other.rank;
    }
}
