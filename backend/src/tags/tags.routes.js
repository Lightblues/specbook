import { Router } from 'express';
import * as tagsService from './tags.service.js';
import { hasUpvoted } from '../ideas/ideas.service.js';
import { optionalAuth } from '../auth/auth.middleware.js';
import { success, error } from '../utils/response.js';

const router = Router();

// GET /tags - List popular tags (public)
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const tags = await tagsService.getPopularTags(limit);
    success(res, { tags });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// GET /tags/:name/ideas - Get ideas by tag (public)
router.get('/:name/ideas', optionalAuth, async (req, res) => {
  try {
    const { sort, limit, offset } = req.query;
    const ideas = await tagsService.getIdeasByTag(req.params.name, {
      sort: sort || 'hot',
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
    });

    // Add upvoted status if user is logged in
    if (req.user) {
      for (const idea of ideas) {
        idea.upvoted = await hasUpvoted(idea.id, req.user.id);
      }
    }

    success(res, { tag: req.params.name, ideas });
  } catch (err) {
    error(res, err.message, 500);
  }
});

export default router;
