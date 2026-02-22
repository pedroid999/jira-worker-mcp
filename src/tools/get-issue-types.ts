import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { JiraClient } from '../jira-client.js';
import { GetIssueTypesSchema } from '../types.js';

export function register(server: McpServer, client: JiraClient): void {
  server.registerTool(
    'get_issue_types',
    {
      title: 'Get Issue Types',
      description: 'Returns available issue types for a given Jira project.',
      inputSchema: GetIssueTypesSchema,
    },
    async ({ projectKey }) => {
      const issueTypes = await client.getIssueTypes(projectKey);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(issueTypes, null, 2),
          },
        ],
      };
    },
  );
}
