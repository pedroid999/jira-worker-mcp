import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { JiraClient } from '../jira-client.js';
import { GetIssueSchema } from '../types.js';

export function register(server: McpServer, client: JiraClient): void {
  server.registerTool(
    'get_issue',
    {
      title: 'Get Jira Issue',
      description:
        'Retrieves detailed information about a Jira issue by its key. Returns summary, status, assignee, priority, description (as plain text), comments, subtasks, and other fields.',
      inputSchema: GetIssueSchema,
    },
    async ({ issueKey, fields }) => {
      const issue = await client.getIssue(issueKey, fields);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(issue, null, 2),
          },
        ],
      };
    },
  );
}
