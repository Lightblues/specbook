import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import fs from 'fs/promises';
import { config } from './config.js';
import { initDb } from './db/index.js';
import authRoutes from './auth/auth.routes.js';
import projectsRoutes from './projects/projects.routes.js';
import specsRoutes from './specs/specs.routes.js';
import ideasRoutes from './ideas/ideas.routes.js';
import tagsRoutes from './tags/tags.routes.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/ideas', ideasRoutes);  // Independent ideas routes
app.use('/api/v1/tags', tagsRoutes);     // Tags routes
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/projects', specsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
async function start() {
  // Ensure repos directory exists
  await fs.mkdir(config.reposPath, { recursive: true });

  // Initialize database
  await initDb();

  app.listen(config.port, () => {
    console.log(`Specbook API running on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
