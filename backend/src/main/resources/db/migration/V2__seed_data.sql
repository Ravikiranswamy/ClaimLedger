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
    -- 1. Nexora_Old_Brochure_v1.pdf - SUPERSEDED, TIER_3, Marketing
    INSERT INTO knowledge_documents (
        id, name, file_path, department_id, organisation_id,
        approval_status, authority_tier, version, effective_date, expiry_date,
        product_scope, region, channel, category, chunk_count, uploaded_by, created_at
    ) VALUES (
        'dc000001-0000-0000-0000-000000000001',
        'Nexora_Old_Brochure_v1.pdf',
        'uploads/documents/Nexora_Old_Brochure_v1.pdf',
        v_mkt_dept_id,
        v_org_id,
        'SUPERSEDED',
        'TIER_3',
        '1.0',
        '2025-01-01',
        '2026-06-30',
        'Nexora Pro',
        'GLOBAL',
        'ALL',
        'ASSETS',
        1,
        v_admin_id,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET 
        approval_status = EXCLUDED.approval_status,
        authority_tier = EXCLUDED.authority_tier,
        category = EXCLUDED.category,
        chunk_count = EXCLUDED.chunk_count;

    -- 2. Nexora_Sales_Proposal_v2.pdf - APPROVED, TIER_2, Sales, Acme Corp exception
    INSERT INTO knowledge_documents (
        id, name, file_path, department_id, organisation_id,
        approval_status, authority_tier, version, effective_date, expiry_date,
        product_scope, region, channel, category, chunk_count, uploaded_by, created_at
    ) VALUES (
        'dc000002-0000-0000-0000-000000000002',
        'Nexora_Sales_Proposal_v2.pdf',
        'uploads/documents/Nexora_Sales_Proposal_v2.pdf',
        v_sales_dept_id,
        v_org_id,
        'APPROVED',
        'TIER_2',
        '2.1',
        '2026-01-01',
        '2026-12-31',
        'Nexora Pro',
        'GLOBAL',
        'ALL',
        'DEPARTMENTAL',
        2,
        v_admin_id,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET 
        approval_status = EXCLUDED.approval_status,
        authority_tier = EXCLUDED.authority_tier,
        version = EXCLUDED.version,
        category = EXCLUDED.category,
        chunk_count = EXCLUDED.chunk_count;

    -- 3. Product_Master_Catalogue_v4.2.pdf - APPROVED, TIER_1, Sales, product_scope=Nexora Pro, effective 2026-11-01
    INSERT INTO knowledge_documents (
        id, name, file_path, department_id, organisation_id,
        approval_status, authority_tier, version, effective_date, expiry_date,
        product_scope, region, channel, category, chunk_count, uploaded_by, created_at
    ) VALUES (
        'dc000003-0000-0000-0000-000000000003',
        'Product_Master_Catalogue_v4.2.pdf',
        'uploads/documents/Product_Master_Catalogue_v4.2.pdf',
        v_sales_dept_id,
        v_org_id,
        'APPROVED',
        'TIER_1',
        '4.2',
        '2026-11-01',
        '2027-10-31',
        'Nexora Pro',
        'GLOBAL',
        'ALL',
        'PRODUCTS',
        2,
        v_admin_id,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET 
        approval_status = EXCLUDED.approval_status,
        authority_tier = EXCLUDED.authority_tier,
        category = EXCLUDED.category,
        chunk_count = EXCLUDED.chunk_count;

    -- 4. Brand_Guidelines_v2.pdf - APPROVED, TIER_1, Marketing, product_scope=ALL
    INSERT INTO knowledge_documents (
        id, name, file_path, department_id, organisation_id,
        approval_status, authority_tier, version, effective_date, expiry_date,
        product_scope, region, channel, category, chunk_count, uploaded_by, created_at
    ) VALUES (
        'dc000004-0000-0000-0000-000000000004',
        'Brand_Guidelines_v2.pdf',
        'uploads/documents/Brand_Guidelines_v2.pdf',
        v_mkt_dept_id,
        v_org_id,
        'APPROVED',
        'TIER_1',
        '2.0',
        '2026-06-01',
        '2027-06-30',
        'ALL',
        'GLOBAL',
        'ALL',
        'BRAND',
        2,
        v_admin_id,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET 
        approval_status = EXCLUDED.approval_status,
        authority_tier = EXCLUDED.authority_tier,
        category = EXCLUDED.category,
        chunk_count = EXCLUDED.chunk_count;

    -- 5. Nexora_Regional_Compensation_Addendum_2026.pdf - DRAFT, TIER_2, HR, product_scope=All Products
    INSERT INTO knowledge_documents (
        id, name, file_path, department_id, organisation_id,
        approval_status, authority_tier, version, effective_date, expiry_date,
        product_scope, region, channel, category, chunk_count, uploaded_by, created_at
    ) VALUES (
        'dc000005-0000-0000-0000-000000000005',
        'Nexora_Regional_Compensation_Addendum_2026.pdf',
        'uploads/documents/Nexora_Regional_Compensation_Addendum_2026.pdf',
        v_hr_dept_id,
        v_org_id,
        'DRAFT',
        'TIER_2',
        '1.2',
        '2026-11-01',
        '2027-10-31',
        'All Products',
        'GLOBAL',
        'INTERNAL',
        'DEPARTMENTAL',
        2,
        v_admin_id,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET 
        approval_status = EXCLUDED.approval_status,
        authority_tier = EXCLUDED.authority_tier,
        product_scope = EXCLUDED.product_scope,
        category = EXCLUDED.category,
        chunk_count = EXCLUDED.chunk_count;

    -- 6. Nexora_Q4_Social_Media_Copywriting_Kit.pdf - DRAFT, TIER_3, Marketing
    INSERT INTO knowledge_documents (
        id, name, file_path, department_id, organisation_id,
        approval_status, authority_tier, version, effective_date, expiry_date,
        product_scope, region, channel, category, chunk_count, uploaded_by, created_at
    ) VALUES (
        'dc000006-0000-0000-0000-000000000006',
        'Nexora_Q4_Social_Media_Copywriting_Kit.pdf',
        'uploads/documents/Nexora_Q4_Social_Media_Copywriting_Kit.pdf',
        v_mkt_dept_id,
        v_org_id,
        'DRAFT',
        'TIER_3',
        '1.0',
        '2026-11-01',
        '2027-03-31',
        'Nexora Pro',
        'APAC',
        'SOCIAL',
        'BRAND',
        1,
        v_admin_id,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET 
        approval_status = EXCLUDED.approval_status,
        authority_tier = EXCLUDED.authority_tier,
        category = EXCLUDED.category,
        chunk_count = EXCLUDED.chunk_count;

    -- 7. Nexora_APAC_Promotional_Discount_Scheme_Outdated.pdf - REJECTED, TIER_3, Sales
    INSERT INTO knowledge_documents (
        id, name, file_path, department_id, organisation_id,
        approval_status, authority_tier, version, effective_date, expiry_date,
        product_scope, region, channel, category, chunk_count, uploaded_by, created_at
    ) VALUES (
        'dc000007-0000-0000-0000-000000000007',
        'Nexora_APAC_Promotional_Discount_Scheme_Outdated.pdf',
        'uploads/documents/Nexora_APAC_Promotional_Discount_Scheme_Outdated.pdf',
        v_sales_dept_id,
        v_org_id,
        'REJECTED',
        'TIER_3',
        '0.9',
        '2025-06-01',
        '2025-12-31',
        'Nexora Pro',
        'APAC',
        'PARTNER',
        'ASSETS',
        1,
        v_admin_id,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET 
        approval_status = EXCLUDED.approval_status,
        authority_tier = EXCLUDED.authority_tier,
        category = EXCLUDED.category,
        chunk_count = EXCLUDED.chunk_count;

    -- 8. Brand_Guidelines_v3.pdf - DRAFT, TIER_1, Marketing, v3.0
    INSERT INTO knowledge_documents (
        id, name, file_path, department_id, organisation_id,
        approval_status, authority_tier, version, effective_date, expiry_date,
        product_scope, region, channel, category, chunk_count, uploaded_by, created_at
    ) VALUES (
        'dc000008-0000-0000-0000-000000000008',
        'Brand_Guidelines_v3.pdf',
        'uploads/documents/Brand_Guidelines_v3.pdf',
        v_mkt_dept_id,
        v_org_id,
        'DRAFT',
        'TIER_1',
        '3.0',
        '2026-11-01',
        '2027-10-31',
        'ALL',
        'GLOBAL',
        'ALL',
        'BRAND',
        3,
        v_admin_id,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET 
        approval_status = EXCLUDED.approval_status,
        authority_tier = EXCLUDED.authority_tier,
        version = EXCLUDED.version,
        category = EXCLUDED.category,
        chunk_count = EXCLUDED.chunk_count;

    -- 9. Approved_Claims_Register.pdf - DRAFT, TIER_1, Marketing, v1.0
    INSERT INTO knowledge_documents (
        id, name, file_path, department_id, organisation_id,
        approval_status, authority_tier, version, effective_date, expiry_date,
        product_scope, region, channel, category, chunk_count, uploaded_by, created_at
    ) VALUES (
        'dc000009-0000-0000-0000-000000000009',
        'Approved_Claims_Register.pdf',
        'uploads/documents/Approved_Claims_Register.pdf',
        v_mkt_dept_id,
        v_org_id,
        'DRAFT',
        'TIER_1',
        '1.0',
        '2026-11-01',
        '2027-10-31',
        'Nexora Pro',
        'GLOBAL',
        'ALL',
        'BRAND',
        2,
        v_admin_id,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET 
        approval_status = EXCLUDED.approval_status,
        authority_tier = EXCLUDED.authority_tier,
        category = EXCLUDED.category,
        chunk_count = EXCLUDED.chunk_count;

    -- 10. Terminology_and_Messaging_Guide.pdf - DRAFT, TIER_1, Marketing, v1.0
    INSERT INTO knowledge_documents (
        id, name, file_path, department_id, organisation_id,
        approval_status, authority_tier, version, effective_date, expiry_date,
        product_scope, region, channel, category, chunk_count, uploaded_by, created_at
    ) VALUES (
        'dc000010-0000-0000-0000-000000000010',
        'Terminology_and_Messaging_Guide.pdf',
        'uploads/documents/Terminology_and_Messaging_Guide.pdf',
        v_mkt_dept_id,
        v_org_id,
        'DRAFT',
        'TIER_1',
        '1.0',
        '2026-11-01',
        '2027-10-31',
        'ALL',
        'GLOBAL',
        'ALL',
        'TERMINOLOGY',
        2,
        v_admin_id,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET 
        approval_status = EXCLUDED.approval_status,
        authority_tier = EXCLUDED.authority_tier,
        category = EXCLUDED.category,
        chunk_count = EXCLUDED.chunk_count;
END $$;
