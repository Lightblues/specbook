import { query, pool } from '../db/index.js';
import * as gitService from '../specs/git.service.js';
import { nanoid } from '../utils/nanoid.js';
import { config } from '../config.js';

// Fetch random cover image from Unsplash API
async function fetchCoverUrl(tags) {
  if (!config.unsplashAccessKey) {
    console.warn('Unsplash API key not configured, skipping cover image');
    return null;
  }
  try {
    const queryStr = tags && tags.length > 0
      ? tags[0].toLowerCase().replace(/\s+/g, ',')
      : 'code,technology';
    const url = `https://api.unsplash.com/photos/random?query=${queryStr}&orientation=landscape&client_id=${config.unsplashAccessKey}`;
    const response = await fetch(url);

    // If 404 or no photos found, try fallback
    if (response.status === 404 || !response.ok) {
      console.log(`No photos found for "${queryStr}" (status: ${response.status}), trying fallback...`);
      const fallbackUrl = `https://api.unsplash.com/photos/random?query=code,technology&orientation=landscape&client_id=${config.unsplashAccessKey}`;
      const fallbackRes = await fetch(fallbackUrl);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        return fallbackData.urls?.regular || null;
      }
      return null;
    }

    const data = await response.json();
    return data.urls?.regular || null;
  } catch (err) {
    console.error('Failed to fetch Unsplash cover:', err);
    return null;
  }
}

export async function createProject(ownerId, slug, name, description, tags = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const id = nanoid();
    const coverUrl = await fetchCoverUrl(tags);

    const result = await client.query(
      `INSERT INTO projects (id, slug, name, description, owner_id, cover_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, slug, name, description, ownerId, coverUrl]
    );
    const project = result.rows[0];

    // Add owner as member
    await client.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [project.id, ownerId, 'owner']
    );

    // Add tags
    for (const tagName of tags) {
      const tagResult = await client.query(`
        INSERT INTO tags (name) VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [tagName.toLowerCase()]);
      await client.query(`
        INSERT INTO project_tags (project_id, tag_id) VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [project.id, tagResult.rows[0].id]);
    }

    await client.query('COMMIT');

    // Initialize git repo
    await gitService.initRepo(project.id);

    // Create initial skill.md
    const skillContent = generateSkillMd(project);
    await gitService.writeFile(
      project.id,
      'skill.md',
      skillContent,
      'system',
      'Initialize project'
    );

    project.tags = tags;
    return project;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function findProjectBySlug(slug) {
  const result = await query('SELECT * FROM projects WHERE slug = $1', [slug]);
  const project = result.rows[0];
  if (!project) return null;

  // Get tags
  const tagsResult = await query(`
    SELECT t.name FROM tags t
    JOIN project_tags pt ON t.id = pt.tag_id
    WHERE pt.project_id = $1
  `, [project.id]);
  project.tags = tagsResult.rows.map(r => r.name);

  return project;
}

export async function findProjectById(id) {
  const result = await query('SELECT * FROM projects WHERE id = $1', [id]);
  return result.rows[0];
}

export async function listUserProjects(userId) {
  const result = await query(
    `SELECT p.*, pm.role
     FROM projects p
     JOIN project_members pm ON p.id = pm.project_id
     WHERE pm.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function listAllProjects({ tags } = {}) {
  let sql = `
    SELECT p.*, u.name as owner_name
    FROM projects p
    LEFT JOIN users u ON p.owner_id = u.id
  `;
  const params = [];

  // Filter by tags (OR logic - match any of the provided tags)
  if (tags && tags.length > 0) {
    params.push(tags);
    sql += `
      WHERE p.id IN (
        SELECT pt.project_id FROM project_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.name = ANY($1)
      )
    `;
  }

  sql += ` ORDER BY p.created_at DESC`;

  const result = await query(sql, params);

  // Fetch tags for each project
  for (const project of result.rows) {
    const tagsResult = await query(`
      SELECT t.name FROM tags t
      JOIN project_tags pt ON t.id = pt.tag_id
      WHERE pt.project_id = $1
    `, [project.id]);
    project.tags = tagsResult.rows.map(r => r.name);
  }

  return result.rows;
}

// Get popular project tags
export async function getPopularProjectTags(limit = 20) {
  const result = await query(`
    SELECT t.id, t.name, COUNT(pt.project_id)::text as count
    FROM tags t
    JOIN project_tags pt ON t.id = pt.tag_id
    GROUP BY t.id, t.name
    ORDER BY count DESC
    LIMIT $1
  `, [limit]);
  return result.rows;
}

export async function updateProject(projectId, updates) {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (['name', 'description'].includes(key)) {
      fields.push(`${key} = $${idx++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) return null;

  values.push(projectId);
  const result = await query(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteProject(projectId) {
  await gitService.deleteRepo(projectId);
  const result = await query(
    'DELETE FROM projects WHERE id = $1 RETURNING id',
    [projectId]
  );
  return result.rowCount > 0;
}

export async function isProjectMember(projectId, userId) {
  const result = await query(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return result.rows[0];
}

export async function addMember(projectId, userId, role = 'member') {
  const result = await query(
    `INSERT INTO project_members (project_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3
     RETURNING *`,
    [projectId, userId, role]
  );
  return result.rows[0];
}

export async function removeMember(projectId, userId) {
  const result = await query(
    'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 AND role != $3 RETURNING *',
    [projectId, userId, 'owner']
  );
  return result.rowCount > 0;
}

export async function listMembers(projectId) {
  const result = await query(
    `SELECT u.id, u.email, u.name, pm.role, pm.joined_at
     FROM users u
     JOIN project_members pm ON u.id = pm.user_id
     WHERE pm.project_id = $1
     ORDER BY pm.joined_at`,
    [projectId]
  );
  return result.rows;
}

function generateSkillMd(project) {
  return `# ${project.name} - Specbook API

Base URL: \`https://specbook.io/api/v1\`

## Quick Start for Coding Agents

### 1. Authentication

Read your token from \`~/.specbook/credentials.json\`:
\`\`\`json
{"token": "sb_xxxx", "default_project": "${project.slug}"}
\`\`\`

All API calls require:
\`\`\`bash
curl https://specbook.io/api/v1/... \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### 2. Get Project Context (Do This First)

\`\`\`bash
curl https://specbook.io/api/v1/projects/${project.slug}/context \\
  -H "Authorization: Bearer \$TOKEN"
\`\`\`

Returns: main spec + module index + recent ideas

### 3. Read a Specific Spec

\`\`\`bash
curl https://specbook.io/api/v1/projects/${project.slug}/specs/modules/example.spec.md \\
  -H "Authorization: Bearer \$TOKEN"
\`\`\`

### 4. Submit an Idea

\`\`\`bash
curl -X POST https://specbook.io/api/v1/projects/${project.slug}/ideas \\
  -H "Authorization: Bearer \$TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Feature idea", "content": "Description..."}'
\`\`\`

### 5. Update a Spec

\`\`\`bash
curl -X PUT https://specbook.io/api/v1/projects/${project.slug}/specs/main.spec.md \\
  -H "Authorization: Bearer \$TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "# Main Spec\\n\\n...", "message": "Update main spec"}'
\`\`\`
`;
}

export { generateSkillMd };
