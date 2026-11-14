-- V8: Round 3 Semantic Revision Intelligence (Structured Claim Attributes & Attribute Diffing)

ALTER TABLE claims ADD COLUMN IF NOT EXISTS claimed_attributes JSONB;

