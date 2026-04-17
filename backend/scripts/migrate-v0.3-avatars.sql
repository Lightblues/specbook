-- v0.3 Migration: Add avatar support

-- Add avatar_url to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Add cover_url to ideas (for future use)
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS cover_url VARCHAR(500);

-- Add cover_url to projects (for future use)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cover_url VARCHAR(500);
