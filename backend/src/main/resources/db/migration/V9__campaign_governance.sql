-- V9: Round 3 Scoped Authority Resolution & Campaign Governance (Campaigns table & Submissions campaign tracking)

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    allowed_product_scope VARCHAR(100) DEFAULT 'Nexora Pro',
    allowed_discount_price VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS campaign_code VARCHAR(50);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

INSERT INTO campaigns (id, code, name, description, organisation_id, department_id, allowed_product_scope, allowed_discount_price, start_date, end_date, is_approved, created_by)
VALUES (
    'c0000001-0000-0000-0000-000000000001',
    'DIWALI_SPECIAL',
    'Diwali Festive Special 2026',
    'Authorised seasonal promotional discount for Nexora Pro at ₹799 per month billed annually.',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'd0000001-0000-0000-0000-000000000001',
    'Nexora Pro',
    '₹799',
    '2026-10-01',
    '2026-12-31',
    true,
    '00000001-0000-0000-0000-000000000001'
) ON CONFLICT (code) DO NOTHING;

