import { z } from 'zod';

export const CommonIssueFieldsSchema = z.object({
  issueType: z.string().optional().default('Story').describe('Issue type (default: Story)'),
  storyPoints: z.number().optional().describe('Story points (customfield_10016)'),
  originalEstimate: z.string().optional().describe('Original time estimate (e.g., "2h 30m")'),
  priority: z
    .enum(['Highest', 'High', 'Medium', 'Low', 'Lowest'])
    .optional()
    .describe('Issue priority'),
  labels: z.array(z.string()).optional().describe('List of labels to apply'),
  components: z.array(z.string()).optional().describe('List of component names'),
  assignee: z.string().optional().describe('Assignee username or account ID'),
  reporter: z.string().optional().describe('Reporter username or account ID'),
  epicLink: z
    .string()
    .optional()
    .describe('Epic link issue key (customfield_10014)'),
  sprint: z
    .union([z.string(), z.number()])
    .optional()
    .describe('Sprint ID or name (customfield_10020)'),
  fixVersions: z.array(z.string()).optional().describe('List of fix version names'),
  dueDate: z.string().optional().describe('Due date in ISO format (YYYY-MM-DD)'),
  environment: z.string().optional().describe('Environment information'),
  acceptanceCriteria: z
    .string()
    .optional()
    .describe('Acceptance criteria (appended to description as ADF section)'),
});

export const CreateIssueSchema = CommonIssueFieldsSchema.extend({
  projectKey: z.string().describe('Jira project key (e.g., "PROJ")'),
  summary: z.string().describe('Issue summary/title'),
  description: z.string().optional().describe('Issue description (supports Markdown)'),
});

export const GetProjectsSchema = z.object({
  query: z.string().optional().describe('Optional filter query string to search projects'),
});

export const GetIssueTypesSchema = z.object({
  projectKey: z.string().describe('Jira project key to fetch issue types for'),
});

export const UpdateIssueSchema = CommonIssueFieldsSchema.extend({
  issueKey: z.string().describe('Jira issue key to update (e.g., "PROJ-123")'),
  summary: z.string().optional().describe('New summary/title for the issue'),
  description: z.string().optional().describe('New description (supports Markdown)'),
});

export const AddCommentSchema = z.object({
  issueKey: z.string().describe('Jira issue key to comment on (e.g., "PROJ-123")'),
  body: z.string().describe('Comment body (supports Markdown)'),
});

export type CommonIssueFields = z.infer<typeof CommonIssueFieldsSchema>;
export type CreateIssueParams = z.infer<typeof CreateIssueSchema>;
export type GetProjectsParams = z.infer<typeof GetProjectsSchema>;
export type GetIssueTypesParams = z.infer<typeof GetIssueTypesSchema>;
export type UpdateIssueParams = z.infer<typeof UpdateIssueSchema>;
export type AddCommentParams = z.infer<typeof AddCommentSchema>;

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  style?: string;
  isPrivate?: boolean;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description?: string;
  subtask: boolean;
  iconUrl?: string;
}

export interface CreateIssueResult {
  key: string;
  id: string;
  url: string;
}

export interface UpdateIssueResult {
  key: string;
  url: string;
}

export interface AddCommentResult {
  id: string;
  url: string;
}
