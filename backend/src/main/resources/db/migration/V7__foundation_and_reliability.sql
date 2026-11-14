-- V7: Round 3 Foundation & Reliability (Creator Notes separation, Claim Revision tracking, Submission Revisions table)

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS creator_notes TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS revision_number INT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS submission_revisions (
    id UUID PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    revision_number INT NOT NULL,
    content TEXT,
    creator_notes TEXT,
    file_path VARCHAR(255),
    content_type VARCHAR(50) NOT NULL,
    total_claims INT DEFAULT 0,
    verified_claims INT DEFAULT 0,
    violation_claims INT DEFAULT 0,
    unverified_claims INT DEFAULT 0,
    conflict_claims INT DEFAULT 0,
    revision_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_revisions_sub ON submission_revisions(submission_id, revision_number);

