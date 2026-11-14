-- =============================================================================
-- ClaimLedger — CodeTitans India 2026 Hackathon
-- Demo Seed Script: seed_demo_submissions.sql
--
-- PURPOSE: Pre-populate the database with realistic demo submissions covering
--          all 6 test scenarios so judges can review results without submitting.
--
-- USAGE:   Run manually in Neon SQL editor or psql. Flyway is DISABLED in this
--          project — this script is NOT auto-applied on startup.
--
-- SAFE TO RE-RUN: Uses INSERT ... ON CONFLICT DO NOTHING.
-- =============================================================================

-- -------------------------------------------------------------------------
-- 0. Reference IDs (must exist in your DB)
-- -------------------------------------------------------------------------
-- Users (from auth seed):
--   creator    : u0000001-0000-0000-0000-000000000001  (marketing creator)
--   reviewer   : u0000003-0000-0000-0000-000000000003  (reviewer)
--   dept_mgr   : u0000002-0000-0000-0000-000000000002  (sales manager)
--
-- Departments:
--   Marketing  : d0000001-0000-0000-0000-000000000001
--   Sales      : d0000002-0000-0000-0000-000000000002
--
-- Campaigns (from V9 migration):
--   DIWALI_SPECIAL  : active  2026-10-01 → 2026-12-31
--   SUMMER_FLASH_2025: expired 2025-06-01 → 2025-08-31
-- -------------------------------------------------------------------------

BEGIN;

-- =========================================================================
-- SCENARIO 1: Outdated Price in Text (₹799 vs ₹999) → FLAGGED / VIOLATION
-- =========================================================================
INSERT INTO submissions (
  id, title, content_type, raw_text, status,
  department_id, submitted_by, created_at, updated_at,
  revision_number, campaign_id, campaign_code
) VALUES (
  'demo0001-0000-0000-0000-000000000001',
  'Nexora Pro Launch — Social Media Campaign',
  'TEXT',
  'Get Nexora Pro today for ₹799 per month! Complete enterprise AI brand compliance and automated claim verification across all digital channels.',
  'FLAGGED',
  'd0000001-0000-0000-0000-000000000001',
  'u0000001-0000-0000-0000-000000000001',
  NOW() - INTERVAL '5 hours',
  NOW() - INTERVAL '5 hours',
  1,
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO claims (
  id, submission_id, claim_text, claim_type, state,
  ai_confidence, authority_tier, violation_reason,
  resolution_note, revision_number, claimed_attributes, created_at
) VALUES (
  'democlaim-0001-0000-0000-000000000001',
  'demo0001-0000-0000-0000-000000000001',
  '₹799 per month',
  'PRICING',
  'VIOLATION',
  0.97,
  'MASTER_RECORD',
  'Claimed price ₹799 contradicts authoritative master price ₹999 (CIELAB-verified knowledge base match). No active campaign exception found.',
  'Price must be ₹999/user/month unless covered by an active approved campaign.',
  1,
  '{"price": "₹799", "period": "per month", "product": "Nexora Pro"}',
  NOW() - INTERVAL '5 hours'
) ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- SCENARIO 2: Scoped Deal Proposal (₹899) → CONFLICT (needs manager review)
-- =========================================================================
INSERT INTO submissions (
  id, title, content_type, raw_text, status,
  department_id, submitted_by, created_at, updated_at,
  revision_number, campaign_id, campaign_code
) VALUES (
  'demo0002-0000-0000-0000-000000000002',
  'Enterprise Q4 Sales Proposal — Acme Corp',
  'TEXT',
  'Nexora Pro special deal: ₹899 per user per month billed annually under the approved enterprise volume agreement.',
  'UNDER_REVIEW',
  'd0000002-0000-0000-0000-000000000002',
  'u0000001-0000-0000-0000-000000000001',
  NOW() - INTERVAL '4 hours',
  NOW() - INTERVAL '4 hours',
  1,
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO claims (
  id, submission_id, claim_text, claim_type, state,
  ai_confidence, authority_tier, violation_reason,
  resolution_note, revision_number, claimed_attributes, created_at
) VALUES (
  'democlaim-0002-0000-0000-000000000002',
  'demo0002-0000-0000-0000-000000000002',
  '₹899 per user per month billed annually',
  'PRICING',
  'CONFLICT',
  0.84,
  'DEPARTMENT_POLICY',
  'Price ₹899 differs from master (₹999). Departmental volume-deal policy may apply — requires Dept Manager approval.',
  'Sales dept pricing authority covers volume deals. Escalated for Dept Manager sign-off.',
  1,
  '{"price": "₹899", "billing": "annually", "product": "Nexora Pro", "agreement_type": "enterprise_volume"}',
  NOW() - INTERVAL '4 hours'
) ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- SCENARIO 3: Authoritative Master Price (₹999) → VERIFIED
-- =========================================================================
INSERT INTO submissions (
  id, title, content_type, raw_text, status,
  department_id, submitted_by, created_at, updated_at,
  revision_number, campaign_id, campaign_code
) VALUES (
  'demo0003-0000-0000-0000-000000000003',
  'Nexora Pro Product Launch Email',
  'TEXT',
  'Nexora Pro is officially priced at ₹999 per user per month billed annually, backed by enterprise-grade brand governance.',
  'APPROVED',
  'd0000001-0000-0000-0000-000000000001',
  'u0000001-0000-0000-0000-000000000001',
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '3 hours',
  1,
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO claims (
  id, submission_id, claim_text, claim_type, state,
  ai_confidence, authority_tier, violation_reason,
  resolution_note, revision_number, claimed_attributes, created_at
) VALUES (
  'democlaim-0003-0000-0000-000000000003',
  'demo0003-0000-0000-0000-000000000003',
  '₹999 per user per month billed annually',
  'PRICING',
  'VERIFIED',
  0.99,
  'MASTER_RECORD',
  NULL,
  'Exact match with authoritative master price record. Approved.',
  1,
  '{"price": "₹999", "billing": "annually", "product": "Nexora Pro"}',
  NOW() - INTERVAL '3 hours'
) ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- SCENARIO 4 (placeholder): Visual Campaign Banner → UNDER_REVIEW (image)
-- Note: Image submissions require an uploaded file — seeding only metadata.
-- =========================================================================
INSERT INTO submissions (
  id, title, content_type, raw_text, status,
  department_id, submitted_by, created_at, updated_at,
  revision_number, campaign_id, campaign_code
) VALUES (
  'demo0004-0000-0000-0000-000000000004',
  'Nexora Pro Social Campaign — Banner Graphic',
  'IMAGE',
  'Nexora Pro Official Promotional Graphic — Digital Ad Banner',
  'UNDER_REVIEW',
  'd0000001-0000-0000-0000-000000000001',
  'u0000001-0000-0000-0000-000000000001',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours',
  1,
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO claims (
  id, submission_id, claim_text, claim_type, state,
  ai_confidence, authority_tier, violation_reason,
  resolution_note, revision_number, claimed_attributes, created_at
) VALUES (
  'democlaim-0004-0000-0000-000000000004',
  'demo0004-0000-0000-0000-000000000004',
  'Visual brand color palette — CIELAB ΔE76 analysis',
  'VISUAL_BRAND',
  'VIOLATION',
  0.91,
  'BRAND_GUIDELINES',
  'Primary color in banner deviates from brand palette. CIELAB ΔE76 = 31.4 (threshold: 25.0). Off-brand red detected.',
  'Logo clearance zone respected. Color palette must be corrected to match brand hex #0A2540.',
  1,
  '{"dominant_color": "#C0392B", "brand_color": "#0A2540", "delta_e": 31.4, "threshold": 25.0}',
  NOW() - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- SCENARIO 5: Diwali Campaign Exception (DIWALI_SPECIAL + ₹799) → VERIFIED
-- =========================================================================
INSERT INTO submissions (
  id, title, content_type, raw_text, status,
  department_id, submitted_by, created_at, updated_at,
  revision_number, campaign_id, campaign_code
) VALUES (
  'demo0005-0000-0000-0000-000000000005',
  'Nexora Pro Diwali Festive Offer — Social Copy',
  'TEXT',
  'Celebrate Diwali with Nexora Pro at just ₹799 per user per month under our official festive campaign. Limited-time enterprise pricing approved under DIWALI_SPECIAL.',
  'APPROVED',
  'd0000001-0000-0000-0000-000000000001',
  'u0000001-0000-0000-0000-000000000001',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour',
  1,
  (SELECT id FROM campaigns WHERE campaign_code = 'DIWALI_SPECIAL' LIMIT 1),
  'DIWALI_SPECIAL'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO claims (
  id, submission_id, claim_text, claim_type, state,
  ai_confidence, authority_tier, violation_reason,
  resolution_note, revision_number, claimed_attributes, created_at
) VALUES
  (
    'democlaim-0005a-000-0000-000000000005',
    'demo0005-0000-0000-0000-000000000005',
    '₹799 per user per month',
    'PRICING',
    'VERIFIED',
    0.96,
    'CAMPAIGN_RECORD',
    NULL,
    'Price ₹799 is VERIFIED under active campaign DIWALI_SPECIAL (valid 2026-10-01 → 2026-12-31). Campaign governance exception granted.',
    1,
    '{"price": "₹799", "product": "Nexora Pro", "campaign": "DIWALI_SPECIAL"}',
    NOW() - INTERVAL '1 hour'
  ),
  (
    'democlaim-0005b-000-0000-000000000005',
    'demo0005-0000-0000-0000-000000000005',
    'DIWALI_SPECIAL campaign reference',
    'CAMPAIGN_GOVERNANCE',
    'VERIFIED',
    0.99,
    'CAMPAIGN_RECORD',
    NULL,
    'Campaign DIWALI_SPECIAL is ACTIVE (2026-10-01 → 2026-12-31). Submission is within campaign window. Governance: VALID.',
    1,
    '{"campaign_code": "DIWALI_SPECIAL", "status": "ACTIVE", "valid_from": "2026-10-01", "valid_to": "2026-12-31"}',
    NOW() - INTERVAL '1 hour'
  )
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- SCENARIO 6: Expired Campaign Reference (SUMMER_FLASH_2025) → FLAGGED
-- =========================================================================
INSERT INTO submissions (
  id, title, content_type, raw_text, status,
  department_id, submitted_by, created_at, updated_at,
  revision_number, campaign_id, campaign_code
) VALUES (
  'demo0006-0000-0000-0000-000000000006',
  'Summer Flash Sale — Expired Campaign',
  'TEXT',
  'Get Nexora Pro for just ₹699 per user per month under our summer flash deal — act now before the sale ends!',
  'FLAGGED',
  'd0000002-0000-0000-0000-000000000002',
  'u0000001-0000-0000-0000-000000000001',
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '30 minutes',
  1,
  (SELECT id FROM campaigns WHERE campaign_code = 'SUMMER_FLASH_2025' LIMIT 1),
  'SUMMER_FLASH_2025'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO claims (
  id, submission_id, claim_text, claim_type, state,
  ai_confidence, authority_tier, violation_reason,
  resolution_note, revision_number, claimed_attributes, created_at
) VALUES
  (
    'democlaim-0006a-000-0000-000000000006',
    'demo0006-0000-0000-0000-000000000006',
    '₹699 per user per month',
    'PRICING',
    'VIOLATION',
    0.98,
    'MASTER_RECORD',
    'Price ₹699 not authorized under any active campaign or pricing tier.',
    'SUMMER_FLASH_2025 campaign expired on 2025-08-31. No valid exception exists for ₹699.',
    1,
    '{"price": "₹699", "product": "Nexora Pro"}',
    NOW() - INTERVAL '30 minutes'
  ),
  (
    'democlaim-0006b-000-0000-000000000006',
    'demo0006-0000-0000-0000-000000000006',
    'SUMMER_FLASH_2025 campaign reference',
    'CAMPAIGN_GOVERNANCE',
    'VIOLATION',
    0.99,
    'CAMPAIGN_RECORD',
    'Campaign SUMMER_FLASH_2025 expired on 2025-08-31. Use of expired campaign codes is a governance violation.',
    'Remove reference to SUMMER_FLASH_2025. Use only active approved campaigns.',
    1,
    '{"campaign_code": "SUMMER_FLASH_2025", "status": "EXPIRED", "expired_on": "2025-08-31"}',
    NOW() - INTERVAL '30 minutes'
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =========================================================================
-- VERIFY: Run after seeding to confirm records
-- =========================================================================
-- SELECT s.title, s.status, s.campaign_code, COUNT(c.id) AS claim_count
-- FROM submissions s
-- LEFT JOIN claims c ON c.submission_id = s.id
-- WHERE s.id LIKE 'demo%'
-- GROUP BY s.id, s.title, s.status, s.campaign_code
-- ORDER BY s.created_at;

