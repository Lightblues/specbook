---
name: specbook-context
description: Fetch project context from Specbook including specs and ideas. Use before implementing features to understand project requirements.
allowed-tools: Bash(curl *)
argument-hint: <project-slug>
---

# Fetch Specbook Project Context

Retrieve full project context to understand requirements before implementation.

## Usage

```
/specbook-context <project-slug>
```

If no project specified, check `~/.specbook/credentials.json` for `default_project`.

## What to Fetch

### 1. Project Overview

```bash
curl -s "http://9.135.1.140:3310/api/v1/projects/$ARGUMENTS"
```

Returns: name, description, tags, members.

### 2. Full Context (Recommended)

```bash
curl -s "http://9.135.1.140:3310/api/v1/projects/$ARGUMENTS/context"
```

Returns:
- `project`: Basic info
- `main_spec`: README.md or main.spec.md content
- `skill`: skill.md content (API guide)
- `modules`: List of module specs
- `tree`: File structure

### 3. Linked Ideas

```bash
curl -s "http://9.135.1.140:3310/api/v1/projects/$ARGUMENTS/ideas"
```

Returns all ideas linked to this project with full content.

### 4. Specific Spec File (if needed)

```bash
curl -s "http://9.135.1.140:3310/api/v1/projects/$ARGUMENTS/specs/{path}"
```

## Output Format

Present the context in a structured way:

```markdown
## Project: {name}

**Description:** {description}
**Tags:** {tags}
**Members:** {member list}

---

## Specs

### README.md
{content preview or summary}

### skill.md
{API guide summary}

### Other Files
- path/to/file1.md
- path/to/file2.md

---

## Related Ideas ({count})

### 1. {idea title}
**Summary:** {summary}
**Status:** {upvotes} upvotes, {comments} comments

### 2. {idea title}
...
```

## When to Use

1. **Before implementing a feature**: Get full context first
2. **When user mentions a project**: Load context automatically
3. **To understand project architecture**: Review specs and ideas

## Tips

- If context is large, summarize key points first
- Highlight recent ideas (may contain latest requirements)
- Note any conflicts between ideas and existing specs
