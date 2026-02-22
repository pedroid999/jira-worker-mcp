import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { JiraClient, buildFields } from '../jira-client.js';
import { CreateIssueSchema } from '../types.js';

export function register(server: McpServer, client: JiraClient): void {
  server.registerTool(
    'create_issue',
    {
      title: 'Create Jira Issue',
      description:
        'Creates a Jira issue (default type: Story). Converts description Markdown to ADF format.',
      inputSchema: CreateIssueSchema,
    },
    async (params) => {
      const fields = buildFields(
        {
          ...params,
          issueType: params.issueType ?? 'Story',
        },
        true,
      );

      const result = await client.createIssue(fields);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );
}
