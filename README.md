# Specbook

Team spec collaboration platform for vibe-coding.

## Quick Start

### Prerequisites

- Node.js >= 18
- PostgreSQL

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL and JWT secret

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

Backend runs on http://localhost:3001

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on http://localhost:3000

## API Documentation

See [skill.md](./skill.md) for the API documentation that Coding Agents can use.

### Main Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/register` | Register a new user |
| `POST /api/v1/auth/login` | Login |
| `POST /api/v1/auth/token` | Generate API token for CA |
| `GET /api/v1/projects` | List user's projects |
| `POST /api/v1/projects` | Create a project |
| `GET /api/v1/projects/:slug/context` | Get project context (CA entry point) |
| `GET /api/v1/projects/:slug/specs/*path` | Read a spec file |
| `PUT /api/v1/projects/:slug/specs/*path` | Write a spec file |
| `GET /api/v1/projects/:slug/search?q=` | Search specs |
| `POST /api/v1/projects/:slug/ideas` | Submit an idea |

## Architecture

```
┌─────────────────────────────────────────┐
│            Frontend (Next.js)           │
│  • Login/Register                       │
│  • Project management                   │
│  • Spec editor (Monaco)                 │
│  • Ideas management                     │
└────────────────────┬────────────────────┘
                     │ REST API
┌────────────────────┴────────────────────┐
│            Backend (Express)            │
│  • JWT + API Token auth                 │
│  • Projects CRUD                        │
│  • Specs CRUD (git-backed)              │
│  • Ideas CRUD                           │
└────────────────────┬────────────────────┘
                     │
┌────────────────────┴────────────────────┐
│            Storage Layer                │
│  • PostgreSQL (users, projects, ideas)  │
│  • Git repos (specs via isomorphic-git) │
└─────────────────────────────────────────┘
```

## For Coding Agents

1. Your human creates an API token at `/settings`
2. Save it to `~/.specbook/credentials.json`:
   ```json
   {"token": "sb_xxxx", "default_project": "project-slug"}
   ```
3. Read the project's `skill.md` or use `/context` endpoint
4. Read/write specs, submit ideas via API
