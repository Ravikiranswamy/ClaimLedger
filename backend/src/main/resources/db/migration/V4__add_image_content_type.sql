-- V4__add_image_content_type.sql: Expand submissions content_type check constraint to permit IMAGE

DO $$
BEGIN
    -- Safely drop existing check constraint if present
    ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_content_type_check;

    -- Re-create check constraint to permit TEXT, PDF, and IMAGE
    ALTER TABLE submissions ADD CONSTRAINT submissions_content_type_check CHECK (content_type IN ('TEXT', 'PDF', 'IMAGE'));
END $$;
