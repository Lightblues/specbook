import { Router } from 'express';
import { z } from 'zod';
import * as authService from './auth.service.js';
import { authenticate } from './auth.middleware.js';
import { success, error } from '../utils/response.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    const existing = await authService.findUserByEmail(email);
    if (existing) return error(res, 'Email already registered', 400);

    const user = await authService.createUser(email, password, name);
    const token = authService.generateJwt(user.id);
    success(res, { user, token }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(res, 'Validation error', 400, err.errors[0].message);
    }
    error(res, err.message, 500);
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await authService.findUserByEmail(email);
    if (!user) return error(res, 'Invalid credentials', 401);

    const valid = await authService.validatePassword(user, password);
    if (!valid) return error(res, 'Invalid credentials', 401);

    const token = authService.generateJwt(user.id);
    success(res, {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(res, 'Validation error', 400, err.errors[0].message);
    }
    error(res, err.message, 500);
  }
});

// GET /auth/me
router.get('/me', authenticate, (req, res) => {
  success(res, { user: req.user });
});

// POST /auth/token - Generate API token for CA
router.post('/token', authenticate, async (req, res) => {
  try {
    const name = req.body.name || 'API Token';
    const tokenData = await authService.createApiToken(req.user.id, name);
    success(res, {
      ...tokenData,
      hint: 'Save this token! It will not be shown again.',
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// GET /auth/tokens - List API tokens
router.get('/tokens', authenticate, async (req, res) => {
  try {
    const tokens = await authService.listApiTokens(req.user.id);
    success(res, { tokens });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// DELETE /auth/tokens/:id
router.delete('/tokens/:id', authenticate, async (req, res) => {
  try {
    const deleted = await authService.deleteApiToken(req.user.id, req.params.id);
    if (!deleted) return error(res, 'Token not found', 404);
    success(res, { deleted: true });
  } catch (err) {
    error(res, err.message, 500);
  }
});

export default router;
