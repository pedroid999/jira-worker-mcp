#!/usr/bin/env node
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { JiraClient } from './jira-client.js';
import { register as registerCreateIssue } from './tools/create-issue.js';
import { register as registerGetProjects } from './tools/get-projects.js';
import { register as registerGetIssueTypes } from './tools/get-issue-types.js';
import { register as registerUpdateIssue } from './tools/update-issue.js';
import { register as registerAddComment } from './tools/add-comment.js';

const client = new JiraClient();
const server = new McpServer({ name: 'jira-worker-mcp', version: '1.0.0' });

registerCreateIssue(server, client);
registerGetProjects(server, client);
registerGetIssueTypes(server, client);
registerUpdateIssue(server, client);
registerAddComment(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('jira-worker-mcp running on stdio');
