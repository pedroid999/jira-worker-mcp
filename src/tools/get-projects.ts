import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { JiraClient } from '../jira-client.js';
import { GetProjectsSchema } from '../types.js';

export function register(server: McpServer, client: JiraClient): void {
  server.registerTool(
    'get_projects',
    {
      title: 'Get Jira Projects',
      description:
        'Lists accessible Jira projects. Optionally filter by query string.',
      inputSchema: GetProjectsSchema,
    },
    async ({ query }) => {
      const projects = await client.getProjects(query);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    },
  );
}
