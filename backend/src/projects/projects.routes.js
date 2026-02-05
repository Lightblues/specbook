import { Router } from 'express';
import { z } from 'zod';
import * as projectsService from './projects.service.js';
import { getProjectIdeas } from '../ideas/ideas.service.js';
import { findUserByEmail } from '../auth/auth.service.js';
import { authenticate, optionalAuth } from '../auth/auth.middleware.js';
import { success, error } from '../utils/response.js';

const router = Router();

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

// Middleware to load project (public)
async function loadProject(req, res, next) {
  const project = await projectsService.findProjectBySlug(req.params.slug);
  if (!project) return error(res, 'Project not found', 404);
  req.project = project;
  next();
}

// Middleware to load project and check membership (for editing)
async function loadProjectWithMembership(req, res, next) {
  const project = await projectsService.findProjectBySlug(req.params.slug);
  if (!project) return error(res, 'Project not found', 404);

  const membership = await projectsService.isProjectMember(project.id, req.user.id);
  if (!membership) return error(res, 'Not a project member', 403);

  req.project = project;
  req.membership = membership;
  next();
}

// GET /projects/tags - Get popular project tags (public)
router.get('/tags', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const tags = await projectsService.getPopularProjectTags(limit);
    success(res, { tags });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// GET /projects - List all projects (public)
router.get('/', async (req, res) => {
  try {
    const { tags: tagStr } = req.query;
    const tags = tagStr ? tagStr.split(',').map(t => t.trim()) : undefined;
    const projects = await projectsService.listAllProjects({ tags });
    success(res, { projects });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// POST /projects - Create project (auth required)
router.post('/', authenticate, async (req, res) => {
  try {
    const data = createSchema.parse(req.body);
    const existing = await projectsService.findProjectBySlug(data.slug);
    if (existing) return error(res, 'Slug already taken', 400);

    const project = await projectsService.createProject(
      req.user.id,
      data.slug,
      data.name,
      data.description,
      data.tags
    );
    success(res, { project }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(res, 'Validation error', 400, err.errors[0].message);
    }
    error(res, err.message, 500);
  }
});

// GET /projects/:slug - Get project details (public)
router.get('/:slug', optionalAuth, loadProject, async (req, res) => {
  try {
    const members = await projectsService.listMembers(req.project.id);

    // Check if current user is a member
    let role = null;
    if (req.user) {
      const membership = await projectsService.isProjectMember(req.project.id, req.user.id);
      role = membership?.role || null;
    }

    success(res, { project: req.project, members, role });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// PATCH /projects/:slug - Update project (admin+ required)
router.patch('/:slug', authenticate, loadProjectWithMembership, async (req, res) => {
  try {
    if (!['owner', 'admin'].includes(req.membership.role)) {
      return error(res, 'Permission denied', 403);
    }

    const data = updateSchema.parse(req.body);
    const project = await projectsService.updateProject(req.project.id, data);
    success(res, { project });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(res, 'Validation error', 400, err.errors[0].message);
    }
    error(res, err.message, 500);
  }
});

// DELETE /projects/:slug - Delete project (owner only)
router.delete('/:slug', authenticate, loadProjectWithMembership, async (req, res) => {
  try {
    if (req.membership.role !== 'owner') {
      return error(res, 'Only owner can delete project', 403);
    }

    await projectsService.deleteProject(req.project.id);
    success(res, { deleted: true });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// POST /projects/:slug/members - Add member (admin+ required)
router.post('/:slug/members', authenticate, loadProjectWithMembership, async (req, res) => {
  try {
    if (!['owner', 'admin'].includes(req.membership.role)) {
      return error(res, 'Permission denied', 403);
    }

    const { email, role = 'member' } = req.body;
    if (!email) return error(res, 'Email is required', 400);

    const user = await findUserByEmail(email);
    if (!user) return error(res, 'User not found', 404);

    await projectsService.addMember(req.project.id, user.id, role);
    const members = await projectsService.listMembers(req.project.id);
    success(res, { members });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// DELETE /projects/:slug/members/:userId - Remove member (admin+ required)
router.delete('/:slug/members/:userId', authenticate, loadProjectWithMembership, async (req, res) => {
  try {
    if (!['owner', 'admin'].includes(req.membership.role)) {
      return error(res, 'Permission denied', 403);
    }

    const removed = await projectsService.removeMember(req.project.id, req.params.userId);
    if (!removed) return error(res, 'Cannot remove member or member is owner', 400);

    success(res, { removed: true });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// GET /projects/:slug/ideas - Get linked ideas (public)
router.get('/:slug/ideas', loadProject, async (req, res) => {
  try {
    const ideas = await getProjectIdeas(req.project.id);
    success(res, { ideas });
  } catch (err) {
    error(res, err.message, 500);
  }
});

export default router;
export { loadProject, loadProjectWithMembership };
