---
name: specbook-sync
description: Update project specs based on discussed ideas. Use after reaching consensus on ideas to formalize them into specs.
allowed-tools: Bash(curl *), Read(~/.specbook/credentials.json)
argument-hint: <project-slug>
---

# Sync Ideas to Specs

Update project specification files based on discussed and agreed ideas.

## Workflow

### Phase 1: Gather Context

Fetch current state:

```bash
# Get project context
curl -s "http://9.135.1.140:3310/api/v1/projects/$ARGUMENTS/context"

# Get linked ideas
curl -s "http://9.135.1.140:3310/api/v1/projects/$ARGUMENTS/ideas"
```

### Phase 2: Analyze

Compare ideas with existing specs:
1. Identify ideas not yet reflected in specs
2. Check for conflicts or outdated content
3. Determine which spec files need updates

Present analysis to user:
```
## Analysis

### New Content from Ideas
- Idea A: Proposes X (not in specs)
- Idea B: Updates Y (conflicts with current spec)

### Suggested Updates
1. Update README.md: Add section about X
2. Create api.spec.md: Document new endpoints
3. Update skill.md: Add new API examples
```

### Phase 3: Plan Updates

For each file to update:
- Show current content (or "new file")
- Show proposed changes
- Get user confirmation

### Phase 4: Execute Updates

After user confirms, update via API:

```bash
TOKEN=$(cat ~/.specbook/credentials.json | jq -r '.token')

curl -X PUT "http://9.135.1.140:3310/api/v1/projects/$ARGUMENTS/specs/{path}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Updated content...",
    "message": "Sync from idea {idea_id}: {brief description}"
  }'
```

### Phase 5: Verify

After updates:
```bash
# Verify file tree
curl -s "http://9.135.1.140:3310/api/v1/projects/$ARGUMENTS/tree"
```

Report results to user.

## Commit Message Convention

Use descriptive commit messages that reference source ideas:

```
Sync from idea ABC123: Add authentication flow
Sync from ideas ABC123, DEF456: Update API documentation
Add README.md based on project vision discussions
```

## Output

After successful sync:
1. List all updated files
2. Show commit messages
3. Provide links to view changes online

## Example Session

```
User: /specbook-sync myproject

Agent: Let me analyze the project context...

## Analysis
Found 3 ideas linked to myproject:
1. "Add user auth" (5 upvotes) - Not in specs
2. "API rate limiting" (3 upvotes) - Partially documented
3. "Dark mode" (1 upvote) - Not in specs

## Suggested Updates
1. Create auth.spec.md from idea #1
2. Update api.spec.md with rate limiting details

Proceed with these updates? [show content preview]

User: yes

Agent: [executes updates]

## Results
✓ Created auth.spec.md
✓ Updated api.spec.md

View changes:
- http://9.135.1.140:3311/projects/myproject/blob/auth.spec.md
- http://9.135.1.140:3311/projects/myproject/blob/api.spec.md
```

## Best Practices

1. **Don't auto-sync everything**: Let user choose which ideas to formalize
2. **Preserve existing content**: Merge, don't replace
3. **Reference sources**: Link back to ideas in specs when relevant
4. **Incremental updates**: Smaller, focused updates are better than large rewrites
