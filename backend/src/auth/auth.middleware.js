import { verifyJwt, validateApiToken, findUserById } from './auth.service.js';
import { error } from '../utils/response.js';

// Parse token and set req.user, returns user or null
async function parseToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  // Try API token first (sb_xxx)
  if (token.startsWith('sb_')) {
    return await validateApiToken(token);
  }

  // Try JWT
  try {
    const payload = verifyJwt(token);
    return await findUserById(payload.userId);
  } catch {
    return null;
  }
}

// Required authentication
export async function authenticate(req, res, next) {
  const user = await parseToken(req.headers.authorization);
  if (!user) {
    return error(res, 'Authentication required', 401);
  }
  req.user = user;
  next();
}

// Optional authentication - sets req.user if token present, continues regardless
export async function optionalAuth(req, res, next) {
  req.user = await parseToken(req.headers.authorization);
  next();
}
