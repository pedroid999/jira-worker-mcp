import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { JiraClient, toADF } from '../jira-client.js';
import { AddCommentSchema } from '../types.js';

export function register(server: McpServer, client: JiraClient): void {
  server.registerTool(
    'add_comment',
    {
      title: 'Add Comment to Jira Issue',
      description:
        'Adds a comment (converted from Markdown to ADF) to an existing Jira issue.',
      inputSchema: AddCommentSchema,
    },
    async ({ issueKey, body }) => {
      const adfBody = toADF(body);
      const result = await client.addComment(issueKey, adfBody);

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
