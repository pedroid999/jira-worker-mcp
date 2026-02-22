import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { JiraClient, buildFields } from '../jira-client.js';
import { UpdateIssueSchema } from '../types.js';

export function register(server: McpServer, client: JiraClient): void {
  server.registerTool(
    'update_issue',
    {
      title: 'Update Jira Issue',
      description: 'Updates fields on an existing Jira issue.',
      inputSchema: UpdateIssueSchema,
    },
    async (params) => {
      const { issueKey, ...rest } = params;

      // Build the fields object (same as create but without projectKey)
      const builtFields = buildFields(rest, false);

      // Convert fields to Jira v3 update format: { update: { field: [{ set: value }] } }
      // Some fields go into `fields` (simple ones), others into `update`
      // For simplicity and broad compatibility, we use `fields` for partial updates
      // Jira REST API v3 accepts `fields` for PUT /issue/{issueKey}
      const body: Record<string, unknown> = {
        fields: builtFields,
      };

      const result = await client.updateIssue(issueKey, body);

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
