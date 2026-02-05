import { Router } from 'express';
import { z } from 'zod';
import * as gitService from './git.service.js';
import { findProjectBySlug, isProjectMember } from '../projects/projects.service.js';
import { authenticate } from '../auth/auth.middleware.js';
import { success, error } from '../utils/response.js';

const router = Router();

const writeSchema = z.object({
  content: z.string(),
  message: z.string().optional(),
});

// Middleware to load project (public)
async function loadProject(req, res, next) {
  const project = await findProjectBySlug(req.params.slug);
  if (!project) return error(res, 'Project not found', 404);
  req.project = project;
  next();
}

// Middleware to load project and check membership (for editing)
async function loadProjectWithMembership(req, res, next) {
  const project = await findProjectBySlug(req.params.slug);
  if (!project) return error(res, 'Project not found', 404);

  const membership = await isProjectMember(project.id, req.user.id);
  if (!membership) return error(res, 'Not a project member', 403);

  req.project = project;
  req.membership = membership;
  next();
}

// GET /projects/:slug/tree (public)
router.get('/:slug/tree', loadProject, async (req, res) => {
  try {
    const tree = await gitService.getTree(req.project.id);
    success(res, { tree });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// GET /projects/:slug/readme - Get README/SPEC/SKILL.md (public)
router.get('/:slug/readme', loadProject, async (req, res) => {
  try {
    const projectId = req.project.id;
    const candidates = ['README.md', 'readme.md', 'SPEC.md', 'spec.md', 'SKILL.md', 'skill.md'];

    for (const file of candidates) {
      const content = await gitService.readFile(projectId, file);
      if (content !== null) {
        return success(res, { file, content });
      }
    }

    return success(res, { file: null, content: null });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// GET /projects/:slug/context - Main entry point for CA (public)
router.get('/:slug/context', loadProject, async (req, res) => {
  try {
    const projectId = req.project.id;

    // Get main spec
    const mainSpec = await gitService.readFile(projectId, 'main.spec.md');

    // Get skill.md
    const skill = await gitService.readFile(projectId, 'skill.md');

    // Get file tree
    const tree = await gitService.getTree(projectId);

    // Build module index
    const modules = [];
    const files = await gitService.listFiles(projectId);
    for (const file of files) {
      if (
        file.type === 'file' &&
        file.path.endsWith('.spec.md') &&
        file.path !== 'main.spec.md'
      ) {
        const content = await gitService.readFile(projectId, file.path);
        const title = extractTitle(content);
        modules.push({ path: file.path, title });
      }
    }

    success(res, {
      project: {
        slug: req.project.slug,
        name: req.project.name,
        description: req.project.description,
      },
      main_spec: mainSpec,
      skill,
      modules,
      tree,
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// GET /projects/:slug/specs/* - Read a spec file (public)
router.get('/:slug/specs/*', loadProject, async (req, res) => {
  try {
    const filePath = req.params[0];
    if (!filePath) return error(res, 'File path required', 400);

    const { ref } = req.query;

    let content;
    if (ref) {
      content = await gitService.readFileAtCommit(req.project.id, filePath, ref);
    } else {
      content = await gitService.readFile(req.project.id, filePath);
    }

    if (content === null) return error(res, 'File not found', 404);
    success(res, { path: filePath, content, ref: ref || 'HEAD' });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// PUT /projects/:slug/specs/* - Create or update a spec file (member required)
router.put('/:slug/specs/*', authenticate, loadProjectWithMembership, async (req, res) => {
  try {
    const filePath = req.params[0];
    if (!filePath) return error(res, 'File path required', 400);

    const { content, message } = writeSchema.parse(req.body);

    await gitService.writeFile(
      req.project.id,
      filePath,
      content,
      req.user.name || req.user.email,
      message
    );

    success(res, { path: filePath, updated: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(res, 'Validation error', 400, err.errors[0].message);
    }
    error(res, err.message, 500);
  }
});

// DELETE /projects/:slug/specs/* (member required)
router.delete('/:slug/specs/*', authenticate, loadProjectWithMembership, async (req, res) => {
  try {
    const filePath = req.params[0];
    if (!filePath) return error(res, 'File path required', 400);

    // Prevent deleting skill.md
    if (filePath === 'skill.md') {
      return error(res, 'Cannot delete skill.md', 400);
    }

    const deleted = await gitService.deleteFile(
      req.project.id,
      filePath,
      req.user.name || req.user.email,
      `Delete ${filePath}`
    );

    if (!deleted) return error(res, 'File not found', 404);
    success(res, { deleted: true });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// GET /projects/:slug/history/* (public)
router.get('/:slug/history/*', loadProject, async (req, res) => {
  try {
    const filePath = req.params[0];
    const limit = parseInt(req.query.limit) || 20;

    const history = await gitService.getHistory(req.project.id, filePath, limit);
    success(res, { path: filePath, history });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// GET /projects/:slug/search (public)
router.get('/:slug/search', loadProject, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return error(res, 'Query required', 400);

    const files = await gitService.listFiles(req.project.id);
    const results = [];

    for (const file of files) {
      if (file.type !== 'file') continue;

      const content = await gitService.readFile(req.project.id, file.path);
      if (content && content.toLowerCase().includes(q.toLowerCase())) {
        const title = extractTitle(content);
        const snippet = extractSnippet(content, q);
        results.push({ path: file.path, title, snippet });
      }
    }

    success(res, { query: q, results });
  } catch (err) {
    error(res, err.message, 500);
  }
});

function extractTitle(content) {
  if (!content) return null;
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}

function extractSnippet(content, query, contextChars = 100) {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerContent.indexOf(lowerQuery);
  if (idx === -1) return null;

  const start = Math.max(0, idx - contextChars);
  const end = Math.min(content.length, idx + query.length + contextChars);
  let snippet = content.slice(start, end);

  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';

  return snippet;
}

export default router;
