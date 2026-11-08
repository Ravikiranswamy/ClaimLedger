-- V1__init.sql: Initial Schema with pgvector extension for ClaimLedger

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Organisations
CREATE TABLE IF NOT EXISTS organisations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'CREATOR', 'DEPT_MANAGER', 'REVIEWER')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Documents
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    approval_status VARCHAR(50) NOT NULL CHECK (approval_status IN ('DRAFT', 'APPROVED', 'SUPERSEDED', 'REJECTED', 'EXPIRED', 'WITHDRAWN')),
    authority_tier VARCHAR(50) NOT NULL CHECK (authority_tier IN ('TIER_1', 'TIER_2', 'TIER_3')),
    version VARCHAR(50) NOT NULL,
    effective_date DATE,
    expiry_date DATE,
    product_scope VARCHAR(255),
    region VARCHAR(100),
    channel VARCHAR(100),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Document Chunks (with 768-dimensional vector embedding)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    page_number INT NOT NULL,
    embedding vector(768),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    file_path VARCHAR(500),
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('TEXT', 'PDF')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'ANALYZING', 'FLAGGED', 'VERIFIED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED')),
    revision_number INT NOT NULL DEFAULT 1,
    parent_submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Claims
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    claim_text TEXT NOT NULL,
    claim_type VARCHAR(50) NOT NULL CHECK (claim_type IN ('PRICE', 'FEATURE', 'PROMOTION', 'TERMINOLOGY', 'TONE', 'FACTUAL', 'OTHER')),
    verification_status VARCHAR(50) NOT NULL CHECK (verification_status IN ('VERIFIED', 'VIOLATION', 'UNVERIFIED', 'CONFLICT')),
    explanation TEXT,
    suggested_correction TEXT,
    ai_confidence DECIMAL(5, 4),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Evidence
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE SET NULL,
    excerpt TEXT NOT NULL,
    page_number INT,
    relevance_score DECIMAL(5, 4),
    is_authoritative BOOLEAN NOT NULL DEFAULT FALSE,
    authority_tier VARCHAR(50) NOT NULL CHECK (authority_tier IN ('TIER_1', 'TIER_2', 'TIER_3'))
);

-- Review Actions
CREATE TABLE IF NOT EXISTS review_actions (
    id UUID PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('SUBMITTED', 'ANALYZED', 'CREATOR_REVISED', 'REVIEWER_APPROVED', 'REVIEWER_CHANGES_REQUESTED', 'REVIEWER_REJECTED')),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_status ON knowledge_documents(approval_status, authority_tier);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_dept ON knowledge_documents(department_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_dept ON submissions(department_id);
CREATE INDEX IF NOT EXISTS idx_claims_submission ON claims(submission_id);
CREATE INDEX IF NOT EXISTS idx_evidence_claim ON evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_review_actions_sub ON review_actions(submission_id);
