# Specbook Claude Code Plugin

Claude Code plugin for team specification management and vibe-coding collaboration.

## Installation

### From GitHub

```bash
# Add marketplace (one-time)
/plugin marketplace add Lightblues/specbook

# Install plugin
/plugin install specbook@specbook
```

### From Local Path

```bash
# For development/testing
claude --plugin-dir /path/to/packages/specbook/plugin
```

Or add to project's `.claude/settings.json`:
```json
{
  "plugins": [
    "/path/to/packages/specbook/plugin"
  ]
}
```

## Setup

1. **Register** at http://9.135.1.140:3311/register
2. **Generate API token** at http://9.135.1.140:3311/settings
3. **Save credentials**:

```bash
mkdir -p ~/.specbook
echo '{"token": "sb_your_token_here"}' > ~/.specbook/credentials.json
```

## Available Commands

| Command | Description |
|---------|-------------|
| `/specbook-idea [project]` | Discuss and create an idea |
| `/specbook-context <project>` | Fetch project context (specs + ideas) |
| `/specbook-sync <project>` | Update specs based on ideas |

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. /specbook-idea myproject                                    │
│     Discuss → Draft → Confirm → Publish idea                    │
├─────────────────────────────────────────────────────────────────┤
│  2. /specbook-context myproject                                 │
│     Fetch specs + ideas → Summarize → Ready to implement        │
├─────────────────────────────────────────────────────────────────┤
│  3. /specbook-sync myproject                                    │
│     Analyze → Plan updates → Confirm → Commit to specs          │
└─────────────────────────────────────────────────────────────────┘
```

## Example Usage

### Create an Idea

```
/specbook-idea specbook

> I want to add email notifications when someone comments on my idea

[Claude discusses, drafts, and publishes after confirmation]
```

### Get Project Context

```
/specbook-context specbook

[Claude fetches and summarizes project specs and related ideas]
```

### Sync Ideas to Specs

```
/specbook-sync specbook

[Claude analyzes ideas, proposes spec updates, and commits after confirmation]
```

## Plugin Structure

```
plugin/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── skills/
│   ├── specbook/            # Auto-loaded knowledge
│   │   └── SKILL.md
│   ├── specbook-idea/       # /specbook-idea command
│   │   └── SKILL.md
│   ├── specbook-context/    # /specbook-context command
│   │   └── SKILL.md
│   └── specbook-sync/       # /specbook-sync command
│       └── SKILL.md
└── README.md
```

## Links

- **Web UI**: http://9.135.1.140:3311
- **API**: http://9.135.1.140:3310/api/v1
- **Specbook Project**: http://9.135.1.140:3311/projects/specbook

## License

MIT
