---
name: specbook
description: Knowledge about Specbook platform for team specification management. Auto-loaded when discussing ideas, specs, or vibe-coding collaboration.
user-invocable: false
---

# Specbook

Team specification management platform for vibe-coding collaboration.

## What is Specbook?

Specbook helps teams collaborate on software projects by:
1. Converting discussions into structured **Ideas** (via coding agents)
2. Building consensus through comments and upvotes
3. Formalizing agreed ideas into version-controlled **Specs**

## When to Use

Use Specbook when:
- Discussing new features or changes with the user
- Need to share ideas with team members
- Starting implementation and need project context
- Updating project specifications after discussion

## Core Concepts

### Ideas
Atomic, structured documents generated from conversations. Features:
- Independent existence with unique URLs
- Tags for categorization
- Comments and upvotes for collaboration
- Can link to multiple projects

### Projects
Version-controlled spec repositories. Features:
- Git-backed file history
- Public read, member write
- Linked ideas for traceability

## Authentication

Read token from `~/.specbook/credentials.json`:
```json
{"token": "sb_xxxx"}
```

## API Base URL

```
http://9.135.1.140:3310/api/v1
```

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ideas` | POST | Create idea |
| `/ideas/:id/projects` | POST | Link idea to project |
| `/projects/:slug/context` | GET | Get full project context |
| `/projects/:slug/specs/*path` | GET | Read spec file |
| `/projects/:slug/specs/*path` | PUT | Update spec file |

## Available Commands

| Command | Description |
|---------|-------------|
| `/specbook-idea` | Discuss and create an idea |
| `/specbook-context` | Fetch project context (specs + ideas) |
| `/specbook-sync` | Update project specs based on ideas |
