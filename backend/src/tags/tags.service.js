import { pool } from '../db/index.js';

// Get popular tags (by usage count)
export async function getPopularTags(limit = 20) {
  const { rows } = await pool.query(`
    SELECT t.id, t.name, COUNT(it.idea_id) as count
    FROM tags t
    LEFT JOIN idea_tags it ON t.id = it.tag_id
    GROUP BY t.id, t.name
    ORDER BY count DESC
    LIMIT $1
  `, [limit]);
  return rows;
}

// Get ideas by tag name
export async function getIdeasByTag(tagName, { sort = 'hot', limit = 20, offset = 0 } = {}) {
  let orderBy;
  if (sort === 'new') {
    orderBy = 'i.created_at DESC';
  } else if (sort === 'top') {
    orderBy = 'i.upvote_count DESC, i.created_at DESC';
  } else {
    orderBy = '(i.upvote_count + 1) / POWER(EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 3600 + 2, 1.5) DESC';
  }

  const { rows } = await pool.query(`
    SELECT i.*, u.name as author_name
    FROM ideas i
    JOIN idea_tags it ON i.id = it.idea_id
    JOIN tags t ON it.tag_id = t.id
    LEFT JOIN users u ON i.author_id = u.id
    WHERE t.name = $1
    ORDER BY ${orderBy}
    LIMIT $2 OFFSET $3
  `, [tagName.toLowerCase(), limit, offset]);
  return rows;
}
