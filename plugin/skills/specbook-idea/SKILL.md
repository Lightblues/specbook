---
name: specbook-idea
description: Discuss and create an idea on Specbook. Use when user wants to share a thought, proposal, or feature idea with their team.
disable-model-invocation: true
allowed-tools: Bash(curl *), Read(~/.specbook/credentials.json)
argument-hint: [project-slug]
---

# Create Specbook Idea

Help the user formulate and publish an idea to Specbook.

## Workflow

### Phase 1: Understand the Idea

First, understand what the user wants to share:
- What problem does it solve?
- What's the proposed solution?
- Who is the target audience?

Ask clarifying questions if needed.

### Phase 2: Draft the Idea

Structure the idea with these components:

```
Title: (concise, descriptive)
Summary: (1-2 sentences)
Content: (detailed markdown)
Tags: (relevant keywords)
```

**Content structure suggestions:**
- Background/Context
- Problem statement
- Proposed solution
- Benefits/Trade-offs
- Open questions (if any)

### Phase 3: Review with User

Present the draft to the user:
1. Show the formatted content
2. Ask if they want to modify anything
3. Confirm before publishing

### Phase 4: Publish

Once confirmed, publish via API:

```bash
# Read token
TOKEN=$(cat ~/.specbook/credentials.json | jq -r '.token')

# Create idea
curl -X POST "http://9.135.1.140:3310/api/v1/ideas" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "...",
    "summary": "...",
    "content": "...",
    "tags": ["tag1", "tag2"]
  }'
```

### Phase 5: Link to Project (Optional)

If user specified a project (via `$ARGUMENTS` or during discussion):

```bash
curl -X POST "http://9.135.1.140:3310/api/v1/ideas/{idea_id}/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug": "project-slug"}'
```

## Output

After successful creation:
1. Show the idea ID and URL
2. Confirm if linked to project
3. Suggest next steps (view online, share with team)

## Example

User: "I have an idea about adding dark mode to our app"

→ Discuss requirements, benefits, implementation approach
→ Draft structured idea with sections
→ User confirms
→ Publish and link to project
→ Return: "Published! View at http://9.135.1.140:3311/ideas/ABC123"
