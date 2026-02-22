# jira-worker-mcp

An MCP (Model Context Protocol) server for integrating AI agents with the Jira REST API v3. Supports creating, updating, and commenting on issues, as well as listing projects and issue types.

## Installation & Usage

### Via `npx` (recommended)

```bash
npx jira-worker-mcp
```

### Via Claude Code MCP config

Add to your Claude Code MCP configuration (`.claude/settings.json` or `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "jira-worker-mcp": {
      "command": "npx",
      "args": ["jira-worker-mcp"],
      "env": {
        "JIRA_BASE_URL": "https://yourcompany.atlassian.net",
        "JIRA_EMAIL": "user@example.com",
        "JIRA_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

Auth variables injected via the `env` block take precedence over the local `.env` file.

### Via Gemini CLI

Add to your Gemini CLI MCP configuration (`~/.gemini/settings.json` globally or `.gemini/settings.json` per project):

```json
{
  "mcpServers": {
    "jira-worker-mcp": {
      "command": "npx",
      "args": ["jira-worker-mcp"],
      "env": {
        "JIRA_BASE_URL": "$JIRA_BASE_URL",
        "JIRA_EMAIL": "$JIRA_EMAIL",
        "JIRA_API_TOKEN": "$JIRA_API_TOKEN"
      }
    }
  }
}
```

Env vars use `$VAR_NAME` syntax and are substituted from your shell environment at runtime. Alternatively, use the CLI shortcut:

```bash
gemini mcp add jira-worker-mcp npx jira-worker-mcp
```

### Via OpenAI Codex CLI

Add to your Codex CLI MCP configuration (`~/.codex/config.toml` globally or `.codex/config.toml` per project):

```toml
[mcp_servers.jira-worker-mcp]
command = "npx"
args    = ["jira-worker-mcp"]
env     = { JIRA_BASE_URL = "${JIRA_BASE_URL}", JIRA_EMAIL = "${JIRA_EMAIL}", JIRA_API_TOKEN = "${JIRA_API_TOKEN}" }
```

Env vars use `"${VAR_NAME}"` syntax and are substituted from your shell environment at runtime.

### Local development

```bash
git clone <repo>
cd jira-worker-mcp
npm install
cp .env.example .env
# Fill in your Jira credentials in .env
npm run build
node dist/index.js
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JIRA_BASE_URL` | Yes | Your Jira Cloud base URL (e.g., `https://yourcompany.atlassian.net`) |
| `JIRA_EMAIL` | Yes | Jira account email address |
| `JIRA_API_TOKEN` | Yes | Jira API token (generate at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)) |

---

## Tools

### `create_issue`

Creates a new Jira issue. Converts the description from Markdown to Atlassian Document Format (ADF).

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `projectKey` | string | Yes | Jira project key (e.g., `"PROJ"`) |
| `summary` | string | Yes | Issue summary/title |
| `description` | string | No | Issue description (Markdown supported) |
| `issueType` | string | No | Issue type (default: `"Story"`) |
| `priority` | enum | No | `Highest`, `High`, `Medium`, `Low`, `Lowest` |
| `assignee` | string | No | Assignee username or account ID |
| `reporter` | string | No | Reporter username or account ID |
| `labels` | string[] | No | List of labels |
| `components` | string[] | No | List of component names |
| `storyPoints` | number | No | Story points (`customfield_10016`) |
| `originalEstimate` | string | No | Time estimate (e.g., `"2h 30m"`) |
| `epicLink` | string | No | Epic link issue key (`customfield_10014`) |
| `sprint` | string\|number | No | Sprint ID or name (`customfield_10020`) |
| `fixVersions` | string[] | No | Fix version names |
| `dueDate` | string | No | Due date in `YYYY-MM-DD` format |
| `environment` | string | No | Environment information |
| `acceptanceCriteria` | string | No | Acceptance criteria (appended to description) |

**Returns:** `{ key, id, url }`

---

### `get_projects`

Lists accessible Jira projects.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | string | No | Filter projects by name or key |

**Returns:** Array of project objects `{ id, key, name, projectTypeKey }`

---

### `get_issue_types`

Returns available issue types for a given Jira project.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `projectKey` | string | Yes | Jira project key |

**Returns:** Array of issue type objects `{ id, name, description, subtask }`

---

### `update_issue`

Updates fields on an existing Jira issue.

**Parameters:** Same optional fields as `create_issue`, plus:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `issueKey` | string | Yes | Issue key to update (e.g., `"PROJ-123"`) |
| `summary` | string | No | New summary |
| `description` | string | No | New description (Markdown supported) |

**Returns:** `{ key, url }`

---

### `add_comment`

Adds a comment to an existing Jira issue. Converts Markdown to ADF.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `issueKey` | string | Yes | Issue key (e.g., `"PROJ-123"`) |
| `body` | string | Yes | Comment body (Markdown supported) |

**Returns:** `{ id, url }`

---

## Markdown Support

The following Markdown elements are converted to ADF:

- `# Heading` through `###### Heading` → heading nodes (levels 1–6)
- ` ```lang ` ... ` ``` ` → code block with language
- `- item` / `* item` → bullet list
- `1. item` → ordered list
- `**bold**` → strong text
- `*italic*` / `_italic_` → emphasized text
- `` `code` `` → inline code
- Blank lines → paragraph separators

---

## Custom Field Discovery

To discover available custom fields in your Jira instance:

```bash
curl -u user@example.com:your_api_token \
  https://yourcompany.atlassian.net/rest/api/3/field \
  | jq '.[] | select(.custom == true) | {id, name}'
```

---

## Authentication

This server uses **Jira Cloud Basic Auth** (email + API token). API tokens can be generated at:
[id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

---

## Publishing to npm

### Pre-requisites

- An npm account with publish rights to the `jira-worker-mcp` package
- Logged in via `npm login`

### Build

The `prepublishOnly` script in `package.json` automatically runs `npm run build` (TypeScript → `dist/`) before every publish, so you never publish stale or missing JS files:

```json
"prepublishOnly": "npm run build"
```

### What gets published

Only the `dist/` directory is included, controlled by two mechanisms:

- `"files": ["dist"]` in `package.json` — allowlist of what to ship
- `.npmignore` — explicitly excludes `src/`, `.env*`, `.claude/`, `tsconfig.json`, and `*.map` files

Verify the exact file list before publishing:

```bash
npm pack --dry-run
```

### Bump version

Use npm's built-in version command to update `package.json` and create a git tag in one step:

```bash
npm version patch   # 1.0.0 → 1.0.1 (bug fixes)
npm version minor   # 1.0.0 → 1.1.0 (new features)
npm version major   # 1.0.0 → 2.0.0 (breaking changes)
```

### Publish

```bash
npm publish
```

For the first publish (package must be public):

```bash
npm publish --access public
```

### Full release workflow

```bash
npm version patch          # bump version + git tag
git push origin main --tags  # push commit + tag
npm publish                # build + publish to npm
```
