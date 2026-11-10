-- V5__add_visual_brand_claim_type.sql: Expand claims claim_type check constraint to permit VISUAL_BRAND

DO $$
BEGIN
    -- Safely drop existing check constraint if present
    ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_claim_type_check;

    -- Re-create check constraint to permit VISUAL_BRAND alongside factual and textual claim types
    ALTER TABLE claims ADD CONSTRAINT claims_claim_type_check CHECK (claim_type IN ('PRICE', 'FEATURE', 'PROMOTION', 'TERMINOLOGY', 'TONE', 'FACTUAL', 'VISUAL_BRAND', 'OTHER'));
END $$;

