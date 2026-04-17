import { pool } from '../db/index.js';
import { nanoid } from '../utils/nanoid.js';
import { config } from '../config.js';

// Fetch random cover image from Unsplash API
async function fetchCoverUrl(tags) {
  if (!config.unsplashAccessKey) {
    console.warn('Unsplash API key not configured, skipping cover image');
    return null;
  }

  try {
    const query = tags && tags.length > 0
      ? tags[0].toLowerCase().replace(/\s+/g, ',')
      : 'abstract,minimal';

    const url = `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&client_id=${config.unsplashAccessKey}`;
    const response = await fetch(url);

    // If 404 or no photos found, try fallback
    if (response.status === 404 || !response.ok) {
      console.log(`No photos found for "${query}" (status: ${response.status}), trying fallback...`);
      const fallbackUrl = `https://api.unsplash.com/photos/random?query=abstract,minimal&orientation=landscape&client_id=${config.unsplashAccessKey}`;
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

// List ideas with sorting and filtering
export async function listIdeas({ sort = 'hot', limit = 20, offset = 0, authorId, tag, tags, q, projectSlug } = {}) {
  let query = `
    SELECT i.*, u.name as author_name
    FROM ideas i
    LEFT JOIN users u ON i.author_id = u.id
  `;
  const params = [];
  const conditions = [];

  if (authorId) {
    params.push(authorId);
    conditions.push(`i.author_id = $${params.length}`);
  }

  // Single tag filter (legacy)
  if (tag) {
    params.push(tag);
    conditions.push(`i.id IN (
      SELECT it.idea_id FROM idea_tags it
      JOIN tags t ON it.tag_id = t.id
      WHERE t.name = $${params.length}
    )`);
  }

  // Multiple tags filter (OR logic)
  if (tags && tags.length > 0) {
    params.push(tags);
    conditions.push(`i.id IN (
      SELECT it.idea_id FROM idea_tags it
      JOIN tags t ON it.tag_id = t.id
      WHERE t.name = ANY($${params.length})
    )`);
  }

  // Filter by project slug
  if (projectSlug) {
    params.push(projectSlug);
    conditions.push(`i.id IN (
      SELECT ip.idea_id FROM idea_projects ip
      JOIN projects p ON ip.project_id = p.id
      WHERE p.slug = $${params.length}
    )`);
  }

  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(i.title ILIKE $${params.length} OR i.content ILIKE $${params.length})`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  // Sorting
  if (sort === 'new') {
    query += ` ORDER BY i.created_at DESC`;
  } else if (sort === 'top') {
    query += ` ORDER BY i.upvote_count DESC, i.created_at DESC`;
  } else {
    // hot: HN-style ranking
    query += ` ORDER BY (i.upvote_count + 1) / POWER(EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 3600 + 2, 1.5) DESC`;
  }

  params.push(limit, offset);
  query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const { rows } = await pool.query(query, params);
  return rows;
}

// Get idea by ID with tags and projects
export async function findIdeaById(id) {
  const ideaResult = await pool.query(`
    SELECT i.*, u.name as author_name, u.email as author_email
    FROM ideas i
    LEFT JOIN users u ON i.author_id = u.id
    WHERE i.id = $1
  `, [id]);

  if (ideaResult.rows.length === 0) return null;

  const idea = ideaResult.rows[0];

  // Get tags
  const tagsResult = await pool.query(`
    SELECT t.name FROM tags t
    JOIN idea_tags it ON t.id = it.tag_id
    WHERE it.idea_id = $1
  `, [id]);
  idea.tags = tagsResult.rows.map(r => r.name);

  // Get linked projects
  const projectsResult = await pool.query(`
    SELECT p.slug, p.name FROM projects p
    JOIN idea_projects ip ON p.id = ip.project_id
    WHERE ip.idea_id = $1
  `, [id]);
  idea.projects = projectsResult.rows;

  return idea;
}

// Create idea
export async function createIdea(authorId, title, content, summary, tags = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const id = nanoid();
    const coverUrl = await fetchCoverUrl(tags);

    const { rows } = await client.query(`
      INSERT INTO ideas (id, author_id, title, content, summary, cover_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, authorId, title, content, summary, coverUrl]);
    const idea = rows[0];

    // Add tags
    for (const tagName of tags) {
      const tagResult = await client.query(`
        INSERT INTO tags (name) VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [tagName.toLowerCase()]);
      await client.query(`
        INSERT INTO idea_tags (idea_id, tag_id) VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [idea.id, tagResult.rows[0].id]);
    }

    await client.query('COMMIT');
    return idea;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Update idea
export async function updateIdea(id, { title, content, summary, tags }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updates = [];
    const params = [id];

    if (title !== undefined) {
      params.push(title);
      updates.push(`title = $${params.length}`);
    }
    if (content !== undefined) {
      params.push(content);
      updates.push(`content = $${params.length}`);
    }
    if (summary !== undefined) {
      params.push(summary);
      updates.push(`summary = $${params.length}`);
    }

    updates.push('updated_at = NOW()');

    const { rows } = await client.query(`
      UPDATE ideas SET ${updates.join(', ')}
      WHERE id = $1 RETURNING *
    `, params);

    // Update tags if provided
    if (tags !== undefined) {
      await client.query('DELETE FROM idea_tags WHERE idea_id = $1', [id]);
      for (const tagName of tags) {
        const tagResult = await client.query(`
          INSERT INTO tags (name) VALUES ($1)
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `, [tagName.toLowerCase()]);
        await client.query(`
          INSERT INTO idea_tags (idea_id, tag_id) VALUES ($1, $2)
        `, [id, tagResult.rows[0].id]);
      }
    }

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Delete idea
export async function deleteIdea(id) {
  const { rowCount } = await pool.query('DELETE FROM ideas WHERE id = $1', [id]);
  return rowCount > 0;
}

// Toggle upvote
export async function toggleUpvote(ideaId, userId) {
  const existing = await pool.query(
    'SELECT 1 FROM upvotes WHERE idea_id = $1 AND user_id = $2',
    [ideaId, userId]
  );

  if (existing.rows.length > 0) {
    await pool.query('DELETE FROM upvotes WHERE idea_id = $1 AND user_id = $2', [ideaId, userId]);
    await pool.query('UPDATE ideas SET upvote_count = upvote_count - 1 WHERE id = $1', [ideaId]);
    return { upvoted: false };
  } else {
    await pool.query('INSERT INTO upvotes (idea_id, user_id) VALUES ($1, $2)', [ideaId, userId]);
    await pool.query('UPDATE ideas SET upvote_count = upvote_count + 1 WHERE id = $1', [ideaId]);
    return { upvoted: true };
  }
}

// Check if user upvoted
export async function hasUpvoted(ideaId, userId) {
  if (!userId) return false;
  const { rows } = await pool.query(
    'SELECT 1 FROM upvotes WHERE idea_id = $1 AND user_id = $2',
    [ideaId, userId]
  );
  return rows.length > 0;
}

// List comments
export async function listComments(ideaId) {
  const { rows } = await pool.query(`
    SELECT c.*, u.name as author_name
    FROM idea_comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.idea_id = $1
    ORDER BY c.created_at ASC
  `, [ideaId]);
  return rows;
}

// Create comment
export async function createComment(ideaId, authorId, content, parentId = null) {
  const id = nanoid();
  const { rows } = await pool.query(`
    INSERT INTO idea_comments (id, idea_id, author_id, content, parent_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [id, ideaId, authorId, content, parentId]);
  await pool.query('UPDATE ideas SET comment_count = comment_count + 1 WHERE id = $1', [ideaId]);
  return rows[0];
}

// Delete comment
export async function deleteComment(commentId) {
  const comment = await pool.query('SELECT idea_id FROM idea_comments WHERE id = $1', [commentId]);
  if (comment.rows.length === 0) return false;

  await pool.query('DELETE FROM idea_comments WHERE id = $1', [commentId]);
  await pool.query('UPDATE ideas SET comment_count = comment_count - 1 WHERE id = $1', [comment.rows[0].idea_id]);
  return true;
}

// Get comment by ID
export async function findCommentById(commentId) {
  const { rows } = await pool.query('SELECT * FROM idea_comments WHERE id = $1', [commentId]);
  return rows[0] || null;
}

// Link idea to project
export async function linkToProject(ideaId, projectId) {
  await pool.query(`
    INSERT INTO idea_projects (idea_id, project_id) VALUES ($1, $2)
    ON CONFLICT DO NOTHING
  `, [ideaId, projectId]);
}

// Unlink idea from project
export async function unlinkFromProject(ideaId, projectId) {
  const { rowCount } = await pool.query(
    'DELETE FROM idea_projects WHERE idea_id = $1 AND project_id = $2',
    [ideaId, projectId]
  );
  return rowCount > 0;
}

// Get ideas linked to a project
export async function getProjectIdeas(projectId) {
  const { rows } = await pool.query(`
    SELECT i.*, u.name as author_name
    FROM ideas i
    JOIN idea_projects ip ON i.id = ip.idea_id
    LEFT JOIN users u ON i.author_id = u.id
    WHERE ip.project_id = $1
    ORDER BY i.created_at DESC
  `, [projectId]);
  return rows;
}
