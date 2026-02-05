import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { nanoid } from '../utils/nanoid.js';
import { query } from '../db/index.js';
import { config } from '../config.js';

const SALT_ROUNDS = 10;
const TOKEN_PREFIX = 'sb_';

export async function createUser(email, password, name) {
  const id = nanoid();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query(
    'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4) RETURNING id, email, name, created_at',
    [id, email, hash, name]
  );
  return result.rows[0];
}

export async function findUserByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

export async function findUserById(id) {
  const result = await query(
    'SELECT id, email, name, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

export async function validatePassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}

export function generateJwt(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyJwt(token) {
  return jwt.verify(token, config.jwtSecret);
}

// API Token for CA
export async function createApiToken(userId, name) {
  // Use longer token for API security (not short ID)
  const { nanoid: generateToken } = await import('nanoid');
  const token = TOKEN_PREFIX + generateToken(32);
  const hash = await bcrypt.hash(token, SALT_ROUNDS);
  const result = await query(
    'INSERT INTO api_tokens (user_id, token_hash, name) VALUES ($1, $2, $3) RETURNING id, name, created_at',
    [userId, hash, name]
  );
  return { ...result.rows[0], token }; // Return plain token only once
}

export async function validateApiToken(token) {
  if (!token?.startsWith(TOKEN_PREFIX)) return null;

  const result = await query('SELECT * FROM api_tokens');
  for (const row of result.rows) {
    if (await bcrypt.compare(token, row.token_hash)) {
      await query('UPDATE api_tokens SET last_used_at = NOW() WHERE id = $1', [
        row.id,
      ]);
      return await findUserById(row.user_id);
    }
  }
  return null;
}

export async function listApiTokens(userId) {
  const result = await query(
    'SELECT id, name, last_used_at, created_at FROM api_tokens WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

export async function deleteApiToken(userId, tokenId) {
  const result = await query(
    'DELETE FROM api_tokens WHERE id = $1 AND user_id = $2 RETURNING id',
    [tokenId, userId]
  );
  return result.rowCount > 0;
}
