-- Rebuild database with short IDs (v0.4)
-- WARNING: This drops all existing data

-- Drop all tables
DROP TABLE IF EXISTS api_tokens CASCADE;
DROP TABLE IF EXISTS idea_comments CASCADE;
DROP TABLE IF EXISTS upvotes CASCADE;
DROP TABLE IF EXISTS idea_tags CASCADE;
DROP TABLE IF EXISTS idea_projects CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS ideas CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Recreate with new schema
-- Users
CREATE TABLE users (
  id VARCHAR(8) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id VARCHAR(8) PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url VARCHAR(500),
  owner_id VARCHAR(8) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project Members
CREATE TABLE project_members (
  project_id VARCHAR(8) REFERENCES projects(id) ON DELETE CASCADE,
  user_id VARCHAR(8) REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Ideas
CREATE TABLE ideas (
  id VARCHAR(8) PRIMARY KEY,
  author_id VARCHAR(8) REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  summary VARCHAR(500),
  cover_url VARCHAR(500),
  upvote_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Idea-Project Links
CREATE TABLE idea_projects (
  idea_id VARCHAR(8) REFERENCES ideas(id) ON DELETE CASCADE,
  project_id VARCHAR(8) REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, project_id)
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE idea_tags (
  idea_id VARCHAR(8) REFERENCES ideas(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, tag_id)
);

-- Upvotes
CREATE TABLE upvotes (
  user_id VARCHAR(8) REFERENCES users(id) ON DELETE CASCADE,
  idea_id VARCHAR(8) REFERENCES ideas(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, idea_id)
);

-- Comments
CREATE TABLE idea_comments (
  id VARCHAR(8) PRIMARY KEY,
  idea_id VARCHAR(8) REFERENCES ideas(id) ON DELETE CASCADE,
  author_id VARCHAR(8) REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  parent_id VARCHAR(8) REFERENCES idea_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API Tokens
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(8) REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ideas_author ON ideas(author_id);
CREATE INDEX idx_ideas_created ON ideas(created_at DESC);
CREATE INDEX idx_ideas_upvotes ON ideas(upvote_count DESC);
CREATE INDEX idx_upvotes_idea ON upvotes(idea_id);
CREATE INDEX idx_comments_idea ON idea_comments(idea_id);
CREATE INDEX idx_idea_tags_tag ON idea_tags(tag_id);
CREATE INDEX idx_idea_projects_project ON idea_projects(project_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);
