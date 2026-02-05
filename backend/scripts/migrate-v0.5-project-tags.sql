-- Migration v0.5: Project Tags
-- Run: docker exec -i sql_postgres psql -h localhost -U utu -d specbook < migrate-v0.5-project-tags.sql

-- Project Tags table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS project_tags (
  project_id VARCHAR(8) REFERENCES projects(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

-- Index for efficient tag-based queries
CREATE INDEX IF NOT EXISTS idx_project_tags_tag ON project_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_project ON project_tags(project_id);

-- Verify
SELECT 'project_tags table created' AS status;
\dt project_tags
