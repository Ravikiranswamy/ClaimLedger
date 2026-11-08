-- V2__seed_data.sql: Seed demo organisation, departments, users, and knowledge documents with valid hexadecimal UUIDs

DO $$
DECLARE
    v_org_id UUID;
    v_mkt_dept_id UUID;
    v_sales_dept_id UUID;
    v_hr_dept_id UUID;
    v_admin_id UUID;
BEGIN
    -- 1. Demo Organisation: Nexora Technologies
    INSERT INTO organisations (id, name, slug, created_at)
    VALUES ('a1b2c3d4-0000-0000-0000-000000000001', 'Nexora Technologies', 'nexora', CURRENT_TIMESTAMP)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_org_id;

    IF v_org_id IS NULL THEN
        SELECT id INTO v_org_id FROM organisations WHERE slug = 'nexora' LIMIT 1;
    END IF;

    -- 2. Demo Departments
    INSERT INTO departments (id, name, organisation_id)
    VALUES ('d0000001-0000-0000-0000-000000000001', 'Marketing', v_org_id)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, organisation_id = v_org_id
    RETURNING id INTO v_mkt_dept_id;

    IF v_mkt_dept_id IS NULL THEN
        SELECT id INTO v_mkt_dept_id FROM departments WHERE id = 'd0000001-0000-0000-0000-000000000001';
    END IF;

    INSERT INTO departments (id, name, organisation_id)
    VALUES ('d0000002-0000-0000-0000-000000000002', 'Sales', v_org_id)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, organisation_id = v_org_id
    RETURNING id INTO v_sales_dept_id;

    IF v_sales_dept_id IS NULL THEN
        SELECT id INTO v_sales_dept_id FROM departments WHERE id = 'd0000002-0000-0000-0000-000000000002';
    END IF;

    INSERT INTO departments (id, name, organisation_id)
    VALUES ('d0000003-0000-0000-0000-000000000003', 'HR', v_org_id)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, organisation_id = v_org_id
    RETURNING id INTO v_hr_dept_id;

    -- 3. Demo Users (Password: "Demo@1234")
    -- BCrypt Hash: $2a$10$m0BViTr25PJNgIby.E3qLuXgz1H5S7yZF5K.s/.TXK8QDSYtyl70K
    INSERT INTO users (id, email, password_hash, full_name, role, department_id, organisation_id, created_at)
    VALUES (
        '00000001-0000-0000-0000-000000000001',
        'admin@nexora.com',
        '$2a$10$m0BViTr25PJNgIby.E3qLuXgz1H5S7yZF5K.s/.TXK8QDSYtyl70K',
        'Arjun Sharma',
        'ADMIN',
        NULL,
        v_org_id,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (email) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role
    RETURNING id INTO v_admin_id;

    IF v_admin_id IS NULL THEN
        SELECT id INTO v_admin_id FROM users WHERE email = 'admin@nexora.com';
    END IF;

    INSERT INTO users (id, email, password_hash, full_name, role, department_id, organisation_id, created_at)
    VALUES (
        '00000002-0000-0000-0000-000000000002',
        'creator@nexora.com',
        '$2a$10$m0BViTr25PJNgIby.E3qLuXgz1H5S7yZF5K.s/.TXK8QDSYtyl70K',
        'Priya Menon',
        'CREATOR',
        v_mkt_dept_id,
        v_org_id,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (email) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        department_id = EXCLUDED.department_id;

    INSERT INTO users (id, email, password_hash, full_name, role, department_id, organisation_id, created_at)
    VALUES (
        '00000003-0000-0000-0000-000000000003',
        'manager@nexora.com',
        '$2a$10$m0BViTr25PJNgIby.E3qLuXgz1H5S7yZF5K.s/.TXK8QDSYtyl70K',
        'Rahul Verma',
        'DEPT_MANAGER',
        v_mkt_dept_id,
        v_org_id,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (email) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        department_id = EXCLUDED.department_id;

    INSERT INTO users (id, email, password_hash, full_name, role, department_id, organisation_id, created_at)
    VALUES (
        '00000004-0000-0000-0000-000000000004',
        'reviewer@nexora.com',
        '$2a$10$m0BViTr25PJNgIby.E3qLuXgz1H5S7yZF5K.s/.TXK8QDSYtyl70K',
        'Sneha Krishnan',
        'REVIEWER',
        NULL,
        v_org_id,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (email) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role;

    -- 4. Demo Knowledge Documents
    -- 1. Nexora_Old_Brochure_v1.pdf - SUPERSEDED, TIER_3, Sales
    INSERT INTO knowledge_documents (
        id, name, file_path, department_id, organisation_id,
        approval_status, authority_tier, version, effective_date, expiry_date,
        product_scope, region, channel, uploaded_by, created_at
    ) VALUES (
        'dc000001-0000-0000-0000-000000000001',
        'Nexora_Old_Brochure_v1.pdf',
        'uploads/documents/Nexora_Old_Brochure_v1.pdf',
        v_sales_dept_id,
        v_org_id,
        'SUPERSEDED',
        'TIER_3',
        'v1.0',
        '2025-01-01',
        '2025-12-31',
        'Nexora Standard',
        'GLOBAL',
        'ALL',
        v_admin_id,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET 
        approval_status = EXCLUDED.approval_status,
        authority_tier = EXCLUDED.authority_tier;

    -- 2. Nexora_Sales_Proposal_v2.pdf - APPROVED, TIER_2, Sales, product_scope=Nexora Pro
    INSERT INTO knowledge_documents (
        id, name, file_path, department_id, organisation_id,
        approval_status, authority_tier, version, effective_date, expiry_date,
        product_scope, region, channel, uploaded_by, created_at
    ) VALUES (
        'dc000002-0000-0000-0000-000000000002',
        'Nexora_Sales_Proposal_v2.pdf',
        'uploads/documents/Nexora_Sales_Proposal_v2.pdf',
        v_sales_dept_id,
        v_org_id,
        'APPROVED',
        'TIER_2',
        'v2.0',
        '2026-01-01',
        '2026-12-31',
        'Nexora Pro',
        'GLOBAL',
        'ALL',
        v_admin_id,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET 
        approval_status = EXCLUDED.approval_status,
        authority_tier = EXCLUDED.authority_tier;

    -- 3. Product_Master_Catalogue_v4.2.pdf - APPROVED, TIER_1, Sales, product_scope=Nexora Pro, effective 2026-11-01
    INSERT INTO knowledge_documents (
        id, name, file_path, department_id, organisation_id,
        approval_status, authority_tier, version, effective_date, expiry_date,
        product_scope, region, channel, uploaded_by, created_at
    ) VALUES (
        'dc000003-0000-0000-0000-000000000003',
        'Product_Master_Catalogue_v4.2.pdf',
        'uploads/documents/Product_Master_Catalogue_v4.2.pdf',
        v_sales_dept_id,
        v_org_id,
        'APPROVED',
        'TIER_1',
        'v4.2',
        '2026-11-01',
        NULL,
        'Nexora Pro',
        'GLOBAL',
        'ALL',
        v_admin_id,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET 
        approval_status = EXCLUDED.approval_status,
        authority_tier = EXCLUDED.authority_tier;
END $$;
