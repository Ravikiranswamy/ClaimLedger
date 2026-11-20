-- V8: Round 3 Semantic Revision Intelligence (Structured Claim Attributes & Attribute Diffing)

ALTER TABLE claims ADD COLUMN IF NOT EXISTS claimed_attributes TEXT;
ALTER TABLE claims ALTER COLUMN claimed_attributes TYPE text USING claimed_attributes::text;

