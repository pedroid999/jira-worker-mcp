# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**jira-worker-mcp** is an npm-published MCP (Model Context Protocol) server that bridges AI agents (Claude Code, Gemini CLI, OpenAI Codex) to Jira's REST API v3. It enables AI tools to create, update, and comment on Jira issues, and query projects and issue types.

## Common Commands

```bash
# Install dependencies
npm install

# Build TypeScript to dist/
npm run build

# Run the compiled server
npm start

# Watch mode for development
npm run dev

# Publish to npm (auto-builds first)
npm version patch|minor|major
git push origin main --tags
npm publish
```

No test suite is configured. Verify behavior by running the server and connecting via an MCP client.

## Architecture

```
src/
├── index.ts          # Entry point — wires StdioServerTransport + registers all 5 tools
├── jira-client.ts    # Core: Jira REST API client + Markdown→ADF converter
├── types.ts          # Zod schemas and TypeScript interfaces for all tool params/results
└── tools/            # One file per MCP tool, each calls JiraClient methods
    ├── create-issue.ts
    ├── update-issue.ts
    ├── add-comment.ts
    ├── get-projects.ts
    └── get-issue-types.ts
```

### Key Design Decisions

- **ES Modules**: `"type": "module"` in package.json; tsconfig uses `NodeNext` module resolution.
- **Single JiraClient instance**: Created in `index.ts` and passed to every tool on registration.
- **Zod validation**: All tool input parameters are validated at runtime via schemas in `types.ts`.
- **Markdown → ADF**: `jira-client.ts` contains `toADF()` and `parseInline()` to convert Markdown descriptions/comments to Atlassian Document Format before sending to the Jira API.
- **Retry logic on 400**: `createIssue` and `updateIssue` retry once after stripping unsupported custom fields detected via `isUnsupportedFieldError()`.
- **Custom fields**: Story points → `customfield_10016`, epic link → `customfield_10014`, sprint → `customfield_10020`. If these IDs differ in your Jira instance, update `buildFields()` in `jira-client.ts`.

### Jira API Endpoints Used

| Tool | Method | Endpoint |
|------|--------|----------|
| create_issue | POST | `/rest/api/3/issue` |
| update_issue | PUT | `/rest/api/3/issue/{issueKey}` |
| add_comment | POST | `/rest/api/3/issue/{issueKey}/comment` |
| get_projects | GET | `/rest/api/3/project/search` |
| get_issue_types | GET | `/rest/api/3/issuetype/project` |

## Environment Variables

Required in `.env` or passed via the MCP config `env` block (takes precedence over `.env`):

```
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=user@example.com
JIRA_API_TOKEN=your_api_token
```

API tokens are generated at https://id.atlassian.com/manage-profile/security/api-tokens.

## Adding a New Tool

1. Define Zod schema and result interface in `src/types.ts`.
2. Add client method to `JiraClient` in `src/jira-client.ts`.
3. Create `src/tools/your-tool.ts` following the existing tool pattern (register with `server.tool()`).
4. Import and call the registration function in `src/index.ts`.
