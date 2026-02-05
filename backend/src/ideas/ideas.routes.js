import { Router } from 'express';
import { z } from 'zod';
import * as ideasService from './ideas.service.js';
import { findProjectBySlug } from '../projects/projects.service.js';
import { authenticate, optionalAuth } from '../auth/auth.middleware.js';
import { success, error } from '../utils/response.js';

const router = Router();

const createSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  summary: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

const commentSchema = z.object({
  content: z.string().min(1).max(10000),
  parent_id: z.string().length(8).optional(),
});

// GET /ideas - List ideas (public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { sort, limit, offset, tag, tags: tagsStr, q, author, project } = req.query;
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()) : undefined;
    const ideas = await ideasService.listIdeas({
      sort: sort || 'hot',
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
      tag,
      tags,
      q,
      authorId: author,
      projectSlug: project,
    });

    // Add upvoted status if user is logged in
    if (req.user) {
      for (const idea of ideas) {
        idea.upvoted = await ideasService.hasUpvoted(idea.id, req.user.id);
      }
    }

    success(res, { ideas });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// POST /ideas - Create idea (auth required)
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content, summary, tags } = createSchema.parse(req.body);
    const idea = await ideasService.createIdea(req.user.id, title, content, summary, tags);
    success(res, { idea }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(res, 'Validation error', 400, err.errors[0].message);
    }
    error(res, err.message, 500);
  }
});

// GET /ideas/:id - Get idea (public)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const idea = await ideasService.findIdeaById(req.params.id);
    if (!idea) {
      return error(res, 'Idea not found', 404);
    }

    // Add upvoted status if user is logged in
    if (req.user) {
      idea.upvoted = await ideasService.hasUpvoted(idea.id, req.user.id);
    }

    // Get comments
    const comments = await ideasService.listComments(idea.id);

    success(res, { idea, comments });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// PATCH /ideas/:id - Update idea (author only)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const idea = await ideasService.findIdeaById(req.params.id);
    if (!idea) {
      return error(res, 'Idea not found', 404);
    }
    if (idea.author_id !== req.user.id) {
      return error(res, 'Permission denied', 403);
    }

    const data = updateSchema.parse(req.body);
    const updated = await ideasService.updateIdea(req.params.id, data);
    success(res, { idea: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(res, 'Validation error', 400, err.errors[0].message);
    }
    error(res, err.message, 500);
  }
});

// DELETE /ideas/:id - Delete idea (author only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const idea = await ideasService.findIdeaById(req.params.id);
    if (!idea) {
      return error(res, 'Idea not found', 404);
    }
    if (idea.author_id !== req.user.id) {
      return error(res, 'Permission denied', 403);
    }

    await ideasService.deleteIdea(req.params.id);
    success(res, { deleted: true });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// POST /ideas/:id/upvote - Toggle upvote (auth required)
router.post('/:id/upvote', authenticate, async (req, res) => {
  try {
    const idea = await ideasService.findIdeaById(req.params.id);
    if (!idea) {
      return error(res, 'Idea not found', 404);
    }

    const result = await ideasService.toggleUpvote(req.params.id, req.user.id);
    success(res, result);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// GET /ideas/:id/comments - List comments (public)
router.get('/:id/comments', async (req, res) => {
  try {
    const idea = await ideasService.findIdeaById(req.params.id);
    if (!idea) {
      return error(res, 'Idea not found', 404);
    }

    const comments = await ideasService.listComments(req.params.id);
    success(res, { comments });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// POST /ideas/:id/comments - Add comment (auth required)
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const idea = await ideasService.findIdeaById(req.params.id);
    if (!idea) {
      return error(res, 'Idea not found', 404);
    }

    const { content, parent_id } = commentSchema.parse(req.body);
    const comment = await ideasService.createComment(req.params.id, req.user.id, content, parent_id);
    success(res, { comment }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(res, 'Validation error', 400, err.errors[0].message);
    }
    error(res, err.message, 500);
  }
});

// DELETE /ideas/:id/comments/:cid - Delete comment (author only)
router.delete('/:id/comments/:cid', authenticate, async (req, res) => {
  try {
    const comment = await ideasService.findCommentById(req.params.cid);
    if (!comment) {
      return error(res, 'Comment not found', 404);
    }

    // Allow comment author or idea author to delete
    const idea = await ideasService.findIdeaById(req.params.id);
    if (comment.author_id !== req.user.id && idea?.author_id !== req.user.id) {
      return error(res, 'Permission denied', 403);
    }

    await ideasService.deleteComment(req.params.cid);
    success(res, { deleted: true });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// POST /ideas/:id/projects - Link idea to project (auth required)
router.post('/:id/projects', authenticate, async (req, res) => {
  try {
    const idea = await ideasService.findIdeaById(req.params.id);
    if (!idea) {
      return error(res, 'Idea not found', 404);
    }

    const { slug } = req.body;
    if (!slug) {
      return error(res, 'Project slug required', 400);
    }

    const project = await findProjectBySlug(slug);
    if (!project) {
      return error(res, 'Project not found', 404);
    }

    await ideasService.linkToProject(idea.id, project.id);
    success(res, { linked: true });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// DELETE /ideas/:id/projects/:slug - Unlink idea from project (auth required)
router.delete('/:id/projects/:slug', authenticate, async (req, res) => {
  try {
    const idea = await ideasService.findIdeaById(req.params.id);
    if (!idea) {
      return error(res, 'Idea not found', 404);
    }

    const project = await findProjectBySlug(req.params.slug);
    if (!project) {
      return error(res, 'Project not found', 404);
    }

    const unlinked = await ideasService.unlinkFromProject(idea.id, project.id);
    if (!unlinked) {
      return error(res, 'Link not found', 404);
    }
    success(res, { unlinked: true });
  } catch (err) {
    error(res, err.message, 500);
  }
});

export default router;
