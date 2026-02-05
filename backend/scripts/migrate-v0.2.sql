-- Migration script for Specbook v0.2
-- Run this against existing database to upgrade schema

-- 1. Alter ideas table: remove project_id dependency, add new columns
ALTER TABLE ideas DROP CONSTRAINT IF EXISTS ideas_project_id_fkey;
ALTER TABLE ideas DROP COLUMN IF EXISTS project_id;
ALTER TABLE ideas DROP COLUMN IF EXISTS status;
ALTER TABLE ideas DROP COLUMN IF EXISTS merged_to_path;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS summary VARCHAR(500);
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS upvote_count INT DEFAULT 0;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS comment_count INT DEFAULT 0;

-- 2. Change author_id ON DELETE behavior
ALTER TABLE ideas DROP CONSTRAINT IF EXISTS ideas_author_id_fkey;
ALTER TABLE ideas ADD CONSTRAINT ideas_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Create new tables
CREATE TABLE IF NOT EXISTS idea_projects (
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, project_id)
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS idea_tags (
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, tag_id)
);

CREATE TABLE IF NOT EXISTS upvotes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, idea_id)
);

CREATE TABLE IF NOT EXISTS idea_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES idea_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create new indexes
DROP INDEX IF EXISTS idx_ideas_project;
CREATE INDEX IF NOT EXISTS idx_ideas_author ON ideas(author_id);
CREATE INDEX IF NOT EXISTS idx_ideas_created ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_upvotes ON ideas(upvote_count DESC);
CREATE INDEX IF NOT EXISTS idx_upvotes_idea ON upvotes(idea_id);
CREATE INDEX IF NOT EXISTS idx_comments_idea ON idea_comments(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_tags_tag ON idea_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_idea_projects_project ON idea_projects(project_id);
