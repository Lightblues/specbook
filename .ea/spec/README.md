# Specbook

Team specification management platform for vibe-coding collaboration.

## Overview

| Field | Value |
|-------|-------|
| Path | `packages/specbook/` |
| Stack | Express + PostgreSQL + isomorphic-git (Backend), Next.js 15 + React 18 (Frontend) |
| Status | v0.5 Complete - Deployed |
| URLs | Backend: http://9.135.1.140:3310/api/v1, Frontend: http://9.135.1.140:3311 |
| Features | Short IDs, Project tags, Multi-select filters, Unsplash covers |

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Frontend (Next.js 15, port 3311)               │
│  Pages: /, /ideas, /projects, /u/:id, /dashboard│
└──────────────────────┬──────────────────────────┘
                       │ REST API
┌──────────────────────┴──────────────────────────┐
│  Backend (Express, port 3310)                   │
│  /api/v1/{auth,ideas,projects,specs,tags}       │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│  Storage                                        │
│  PostgreSQL: users, ideas, projects, upvotes... │
│  Git Repos: /data/repos/{project-id}/           │
└─────────────────────────────────────────────────┘
```

## Core Concepts

### Ideas
- **Definition**: Atomic, well-structured documents created from CA conversations
- **Independent**: Can exist without projects, has unique URL (`/ideas/:id`)
- **Linkable**: M:N relationship with projects (one idea can relate to multiple projects)
- **Social**: Public by default, supports upvotes and comments

### Projects
- **Definition**: Collection of versioned spec files managed by git
- **Public**: Anyone can view projects and specs
- **Editable**: Only members can modify specs
- **Tagged**: Projects can have tags for categorization and filtering

### Transparency Principle
All content is public by default. Authentication required only for:
- Creating/editing content
- Upvoting and commenting

## Data Models

### PostgreSQL Schema (v0.4)

**ID System**: Uses 8-character base62 short IDs (62^8 = 218 trillion combinations) for all external entities. API tokens and tags keep UUIDs for internal security.

```sql
-- Users (short ID)
CREATE TABLE users (
  id VARCHAR(8) PRIMARY KEY,         -- Short ID: e.g., "3ipsD8dU"
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ideas (short ID)
CREATE TABLE ideas (
  id VARCHAR(8) PRIMARY KEY,         -- Short ID: e.g., "AJIXQI5e"
  author_id VARCHAR(8) REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  summary VARCHAR(500),
  cover_url VARCHAR(500),            -- Unsplash API image
  upvote_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects (short ID)
CREATE TABLE projects (
  id VARCHAR(8) PRIMARY KEY,         -- Short ID: e.g., "YYZ92MqN"
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url VARCHAR(500),
  owner_id VARCHAR(8) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project Members (for edit permissions)
CREATE TABLE project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Idea-Project Links (M:N)
CREATE TABLE idea_projects (
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, project_id)
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE idea_tags (
  idea_id VARCHAR(8) REFERENCES ideas(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, tag_id)
);

-- Project Tags (v0.5)
CREATE TABLE project_tags (
  project_id VARCHAR(8) REFERENCES projects(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

-- Upvotes
CREATE TABLE upvotes (
  user_id VARCHAR(8) REFERENCES users(id) ON DELETE CASCADE,
  idea_id VARCHAR(8) REFERENCES ideas(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, idea_id)
);

-- Comments (short ID)
CREATE TABLE idea_comments (
  id VARCHAR(8) PRIMARY KEY,         -- Short ID: e.g., "7zs3tyUI"
  idea_id VARCHAR(8) REFERENCES ideas(id) ON DELETE CASCADE,
  author_id VARCHAR(8) REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  parent_id VARCHAR(8) REFERENCES idea_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API Tokens (keep UUID for security)
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(8) REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Note**: Tags use UUID internally (not exposed in URLs). All other entities use 8-char short IDs.

### Git Repository

Each project has a working directory at `/data/repos/{project-id}/`:
```
├── main.spec.md
├── skill.md
└── modules/
    └── *.spec.md
```

## API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | - | Create account |
| POST | `/login` | - | Login, returns JWT |
| GET | `/me` | required | Current user info |
| POST | `/token` | required | Generate API token |
| GET | `/tokens` | required | List API tokens |
| DELETE | `/tokens/:id` | required | Revoke token |

### Ideas (`/api/v1/ideas`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | - | List ideas (?sort=hot\|new\|top, ?tag=, ?tags=, ?project=, ?q=, ?author=) |
| POST | `/` | required | Create idea |
| GET | `/:id` | - | Get idea with comments |
| PATCH | `/:id` | author | Update idea |
| DELETE | `/:id` | author | Delete idea |
| POST | `/:id/upvote` | required | Toggle upvote |
| GET | `/:id/comments` | - | List comments |
| POST | `/:id/comments` | required | Add comment |
| DELETE | `/:id/comments/:cid` | author | Delete comment |
| POST | `/:id/projects` | required | Link to project |
| DELETE | `/:id/projects/:slug` | required | Unlink from project |

### Tags (`/api/v1/tags`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | - | List popular tags |
| GET | `/:name/ideas` | - | Ideas by tag |

### Projects (`/api/v1/projects`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tags` | - | List popular project tags |
| GET | `/` | - | List all public projects (?tags=) |
| POST | `/` | required | Create project (with optional tags) |
| GET | `/:slug` | - | Project details + members |
| PATCH | `/:slug` | admin+ | Update project |
| DELETE | `/:slug` | owner | Delete project |
| POST | `/:slug/members` | admin+ | Add member |
| DELETE | `/:slug/members/:id` | admin+ | Remove member |
| GET | `/:slug/ideas` | - | Linked ideas |

### Specs (`/api/v1/projects/:slug`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tree` | - | File tree |
| GET | `/context` | - | Full context for CA |
| GET | `/readme` | - | Auto-detect README/SPEC/SKILL.md |
| GET | `/specs/*path` | - | Read file (?ref=sha) |
| PUT | `/specs/*path` | member | Create/update file |
| DELETE | `/specs/*path` | member | Delete file |
| GET | `/history/*path` | - | Git commit history |
| GET | `/search?q=` | - | Full-text search |

### Response Format

```json
{ "success": true, "data": {...} }
{ "success": false, "error": "message" }
```

## Permission Matrix

```
┌─────────────────┬────────┬────────┬─────────┐
│ Action          │ Anon   │ Logged │ Owner   │
├─────────────────┼────────┼────────┼─────────┤
│ View ideas      │ ✅     │ ✅     │ ✅      │
│ View projects   │ ✅     │ ✅     │ ✅      │
│ Read specs      │ ✅     │ ✅     │ ✅      │
│ Upvote idea     │ ❌     │ ✅     │ ✅      │
│ Comment idea    │ ❌     │ ✅     │ ✅      │
│ Create idea     │ ❌     │ ✅     │ ✅      │
│ Edit idea       │ ❌     │ ❌     │ ✅      │
│ Write spec      │ ❌     │ member │ ✅      │
└─────────────────┴────────┴────────┴─────────┘
```

## Implementation

### Backend (`packages/specbook/backend/`)

```
src/
├── index.js
├── config.js
├── db/
│   ├── index.js
│   └── schema.sql
├── auth/
│   ├── auth.routes.js
│   ├── auth.service.js
│   └── auth.middleware.js    # authenticate, optionalAuth
├── ideas/
│   ├── ideas.routes.js       # CRUD, upvote, comments, project links
│   └── ideas.service.js
├── projects/
│   ├── projects.routes.js
│   └── projects.service.js
├── specs/
│   ├── specs.routes.js       # includes /readme endpoint
│   └── git.service.js
├── tags/
│   ├── tags.routes.js
│   └── tags.service.js
└── utils/
    └── response.js
```

### Frontend (`packages/specbook/frontend/`)

```
src/
├── app/
│   ├── layout.tsx            # Global layout with NavBar
│   ├── page.tsx              # Public homepage (trending ideas, featured projects)
│   ├── login/page.tsx        # Login page
│   ├── register/page.tsx     # Registration page
│   ├── dashboard/page.tsx    # User's projects + ideas (auth required)
│   ├── ideas/
│   │   ├── page.tsx          # Ideas feed (multi-select tag/project filters)
│   │   └── [id]/page.tsx     # Idea detail (markdown render, comments, upvote)
│   ├── projects/
│   │   ├── page.tsx          # Projects list (tag filters, covers)
│   │   ├── new/page.tsx      # Create project (with tags)
│   │   └── [slug]/
│   │       ├── page.tsx            # Project overview (tags, README, tabs)
│   │       ├── files/page.tsx      # File browser (tree view)
│   │       └── blob/[...path]/page.tsx  # File viewer/editor (GitHub-style)
│   ├── tags/[name]/page.tsx  # Redirect to /ideas?tag=xxx
│   ├── u/[id]/page.tsx       # User profile (avatar, ideas by user)
│   ├── users/[id]/page.tsx   # Redirect to /u/:id
│   └── settings/page.tsx     # API token management + profile link
├── components/
│   └── NavBar.tsx            # Unified navigation bar
└── lib/
    ├── api.ts                # API client (auth, ideas, projects, specs, tags)
    └── store.ts              # Zustand auth store
```

Key dependencies: next@15.1, react@18, @tanstack/react-query, zustand, @monaco-editor/react, react-markdown, remark-gfm, @tailwindcss/typography, lucide-react

## Configuration

### Environment Variables

```bash
# Backend (.env)
PORT=3310
DATABASE_URL=postgres://user:pass@localhost:5432/specbook
JWT_SECRET=secret
REPOS_PATH=./data/repos
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3310/api/v1
```

### Deployment

Production: `9.135.1.140`

| Component | Details |
|-----------|---------|
| Backend | pm2 `specbook-api`, port 3310, Node 20 |
| Frontend | pm2 `specbook-frontend`, port 3311, Node 20 |
| Database | PostgreSQL (sql_postgres container), database `specbook` |
| Git Repos | `/root/apps/specbook/backend/data/repos/` |

Management commands:
```bash
ssh devcloud_ubuntu
source ~/.nvm/nvm.sh && nvm use 20

# Process management
pm2 list
pm2 restart specbook-api | specbook-frontend
pm2 logs specbook-api --lines 50

# Database
docker exec -i sql_postgres psql -h localhost -U utu -d specbook -c '\dt'

# Deploy updates
cd ~/apps/specbook
rsync -avz --exclude 'node_modules' --exclude '.next' local/ ./
cd frontend && npm run build
pm2 restart specbook-frontend
```

## Implementation Details

### Sorting Algorithm

Ideas feed sorting (src/ideas/ideas.service.js:37-43):

```js
// ?sort=hot (default) - HN-style decay
score = (upvote_count + 1) / POWER(hours_since_creation + 2, 1.5)

// ?sort=new
ORDER BY created_at DESC

// ?sort=top
ORDER BY upvote_count DESC, created_at DESC
```

### Authentication

Two middleware functions (src/auth/auth.middleware.js):
- `authenticate` - Requires valid JWT or API token (sb_xxx)
- `optionalAuth` - Sets req.user if token present, continues regardless

### Markdown Rendering

Frontend uses:
- `react-markdown` v9.0.1 for rendering
- `remark-gfm` for GitHub Flavored Markdown (tables, task lists)
- `@tailwindcss/typography` for prose styling

Applied in idea detail page and project spec viewer.

### Spec File Preview

Project files page supports preview/code toggle for .md files:
- Preview mode: renders markdown with `ReactMarkdown`
- Code mode: Monaco editor

### User Avatars

Default avatars via DiceBear API:
```
https://api.dicebear.com/7.x/pixel-art/svg?seed={user.id}
```

Custom avatars can be stored in `avatar_url` column.

### Project README Auto-detection

GET `/projects/:slug/readme` checks files in order:
1. README.md / readme.md
2. SPEC.md / spec.md
3. SKILL.md / skill.md

Returns first found, or null if none exist.

### Short ID Generation

Uses nanoid with custom base62 alphabet (backend/src/utils/nanoid.js):
```javascript
import { customAlphabet } from 'nanoid';
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const nanoid = customAlphabet(alphabet, 8);
```

Applied in:
- `auth.service.js:11` - User registration
- `projects.service.js:6` - Project creation
- `ideas.service.js:99` - Idea creation
- `ideas.service.js:238` - Comment creation

### Unsplash Cover Images

Automatic cover generation on idea/project creation:
```javascript
// ideas.service.js and projects.service.js
const url = `https://api.unsplash.com/photos/random?query=${tag}&orientation=landscape&client_id=${apiKey}`;
const response = await fetch(url);
const data = await response.json();
return data.urls?.regular;
```

- Ideas fallback query: `abstract,minimal`
- Projects fallback query: `code,technology`
- API limits: 50 requests/hour (free tier)

### URL Filter Parameters

**Ideas page** (`/ideas`):
- `?tag=ocean` - Single tag filter
- `?tags=design,ocean` - Multi-tag filter (OR logic)
- `?project=specbook` - Filter by linked project

**Projects page** (`/projects`):
- `?tag=spec` - Single tag filter
- `?tags=spec,api` - Multi-tag filter (OR logic)

### GitHub-style File Routes

New routing structure:
- `/projects/:slug/files` - File tree browser
- `/projects/:slug/blob/*path` - View/edit single file with breadcrumbs

File viewer features:
- Preview/Code toggle for .md files
- Edit button (members only)
- Inline save with commit message
- Read-only mode for non-members

## Migration Notes

### v0.1 → v0.2

Breaking changes:
- Ideas no longer bound to projects (removed `project_id` FK)
- Ideas API moved from `/projects/:slug/ideas` → `/ideas`
- Removed `status` and `merged_to_path` fields from ideas
- Removed `/ideas/:id/promote` endpoint

Migration script: `backend/scripts/migrate-v0.2.sql`

### v0.2 → v0.3

Schema additions:
```sql
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE ideas ADD COLUMN cover_url VARCHAR(500);
ALTER TABLE projects ADD COLUMN cover_url VARCHAR(500);
```

Migration script: `backend/scripts/migrate-v0.3-avatars.sql`

Frontend changes:
- Unified navigation bar (removed per-page headers)
- Public homepage with trending content
- Project page restructured: `/projects/:slug` (overview) + `/projects/:slug/files` (editor)
- New pages: `/tags`, `/users/:id`, `/login`, `/register`

### v0.3 → v0.4

**BREAKING**: Complete schema rebuild with short IDs (all data lost)

Changed all primary keys from UUID to VARCHAR(8):
- `users.id`
- `projects.id`
- `ideas.id`
- `idea_comments.id`
- All foreign key references updated

Migration script: `backend/scripts/rebuild-v0.4.sql`

New features:
- Short ID generation with nanoid (8-char base62)
- Unsplash API integration for cover images
- GitHub-style file routes (`/projects/:slug/blob/*path`)
- Cover image display in idea cards and detail pages

## Roadmap

### v0.1 (Complete)
- [x] User auth (register, login, JWT, API tokens)
- [x] Project CRUD + member management
- [x] Spec file CRUD with git versioning
- [x] File history
- [x] Basic ideas (project-bound)

### v0.2 (Complete)
- [x] Independent ideas with unique URLs (`/ideas/:id`)
- [x] M:N idea-project linking
- [x] Public browsing (no auth required for viewing)
- [x] Upvotes for ideas (toggle)
- [x] Comments on ideas (nested support)
- [x] Tags system (auto-create, popular tags)
- [x] Ideas feed (hot/new/top sorting with HN algorithm)
- [x] Markdown rendering (react-markdown + GFM)

### v0.3 (Complete)
- [x] Unified navigation bar across all pages
- [x] Public homepage (trending ideas, featured projects, popular tags)
- [x] Separate login/register routes
- [x] User profile pages (`/users/:id`)
- [x] Tags listing page (`/tags`)
- [x] Project overview page with README auto-render
- [x] Spec file preview/code toggle
- [x] User avatar support (DiceBear default)
- [x] Cover image fields (ideas, projects) - schema ready

### v0.4 (Complete)
- [x] Short IDs for all entities (8-char base62: users, projects, ideas, comments)
- [x] Unsplash API cover images (auto-generated from tags)
- [x] GitHub-style file routes (`/projects/:slug/blob/*path`)
- [x] File tree browser (`/projects/:slug/files`)
- [x] Cover image display in UI (cards, detail pages)
- [x] Breadcrumb navigation for files

### v0.5 (Complete)
- [x] Project tags system (`project_tags` table)
- [x] Multi-select tag filters on Ideas and Projects pages
- [x] URL parameter support for filters (`?tags=`, `?project=`)
- [x] Project covers (Unsplash API based on tags)
- [x] User profile route change: `/users/:id` → `/u/:id`
- [x] Tags route removal: `/tags` deleted, `/tags/:name` redirects to `/ideas?tag=`
- [x] Dashboard shows both projects and ideas
- [x] Settings page "View my profile" link
- [x] Removed "New Idea" button (Ideas created via API only)
- [x] Homepage redesign (removed Popular Tags section)

Migration script: `backend/scripts/migrate-v0.5-project-tags.sql`

### v0.6 (Future)
- [ ] Semantic search (pgvector)
- [ ] Email notifications
- [ ] Custom cover upload
- [ ] Idea drafts
- [ ] Activity feed
