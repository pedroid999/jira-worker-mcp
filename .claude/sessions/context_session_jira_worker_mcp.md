# Session Context: jira-worker-mcp

## Status: Implementation In Progress

## Objectives

Build a fully functional MCP (Model Context Protocol) server in TypeScript that integrates with the Jira REST API v3. The server must be distributable via `npx` and expose 5 tools for an AI agent to manage Jira issues.

## Plan Summary

- Runtime: Node.js ESM (`"type": "module"`)
- Language: TypeScript strict, compiled to `dist/`
- MCP SDK: `@modelcontextprotocol/sdk` v1.26.0
- HTTP: `axios`
- Validation: `zod`
- Env: `dotenv`
- Build: `tsc` with `NodeNext` module resolution

## Files to Create

```
jira-worker-mcp/
├── src/
│   ├── index.ts              # Entrypoint, McpServer setup, tool registration
│   ├── jira-client.ts        # JiraClient class + toADF() helper
│   ├── tools/
│   │   ├── create-issue.ts
│   │   ├── get-projects.ts
│   │   ├── get-issue-types.ts
│   │   ├── update-issue.ts
│   │   └── add-comment.ts
│   └── types.ts              # Zod schemas + inferred TS types
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Module system | ESM (`"type": "module"`) | Required by MCP SDK, modern Node.js standard |
| Module resolution | `NodeNext` | Correct for ESM + Node.js; requires `.js` extensions |
| Tool registration | `server.registerTool()` | MCP SDK 1.26.0 high-level API with Zod schema integration |
| Field building | Separate helper in `jira-client.ts` | Reused by both create and update tools |
| Update API format | `update` object with `set` operations | Correct Jira API v3 pattern for partial updates |
| Error retry | Strip unsupported fields on 400 | Per spec: "unsupported fields must trigger retry without failing" |
| ADF conversion | Custom line-by-line parser | No external dep needed; covers all required node types |

## Implementation Status: COMPLETE

- [x] package.json
- [x] tsconfig.json
- [x] .env.example
- [x] src/types.ts — Zod schemas for all 5 tools + TypeScript types
- [x] src/jira-client.ts — JiraClient, toADF(), buildFields()
- [x] src/tools/create-issue.ts
- [x] src/tools/get-projects.ts
- [x] src/tools/get-issue-types.ts
- [x] src/tools/update-issue.ts
- [x] src/tools/add-comment.ts
- [x] src/index.ts — entrypoint with shebang
- [x] README.md

## Build & Test Results

- `npm install` — 106 packages installed, 0 vulnerabilities
- `npm run build` — TypeScript compiled to `dist/`, shebang preserved, chmod +x applied
- Smoke test: Server starts successfully and outputs `jira-worker-mcp running on stdio`

## Issues Resolved During Implementation

- **Type error**: `AdfDoc` is not assignable to `Record<string, unknown>` — fixed by changing `addComment` parameter type from `Record<string, unknown>` to `object`

## Tools Exposed

1. `create_issue` - Creates a Jira issue with optional fields
2. `get_projects` - Lists accessible Jira projects
3. `get_issue_types` - Returns available issue types for a project
4. `update_issue` - Updates fields on an existing issue
5. `add_comment` - Adds a comment to an existing issue
