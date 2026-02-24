import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  JiraProject,
  JiraIssueType,
  CreateIssueResult,
  UpdateIssueResult,
  AddCommentResult,
  CommonIssueFields,
} from './types.js';

// ─── ADF Node types ──────────────────────────────────────────────────────────

interface AdfTextNode {
  type: 'text';
  text: string;
  marks?: Array<{ type: string }>;
}

interface AdfInlineNode {
  type: 'text';
  text: string;
  marks?: Array<{ type: string }>;
}

interface AdfBlockNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Array<AdfBlockNode | AdfInlineNode>;
  marks?: Array<{ type: string }>;
  text?: string;
}

interface AdfDoc {
  version: 1;
  type: 'doc';
  content: AdfBlockNode[];
}

// ─── ADF Converter ───────────────────────────────────────────────────────────

function isTableRow(line: string): boolean {
  return line.trim().startsWith('|');
}

function isSeparatorRow(line: string): boolean {
  return /^\|[\s|:-]+\|$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map(cell => cell.trim());
}

function parseInline(text: string): AdfInlineNode[] {
  const nodes: AdfInlineNode[] = [];
  // Regex captures: **bold**, *em*, _em_, `code`, plain
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|`(.+?)`|([^*_`]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[1] !== undefined) {
      nodes.push({ type: 'text', text: match[1], marks: [{ type: 'strong' }] });
    } else if (match[2] !== undefined) {
      nodes.push({ type: 'text', text: match[2], marks: [{ type: 'em' }] });
    } else if (match[3] !== undefined) {
      nodes.push({ type: 'text', text: match[3], marks: [{ type: 'em' }] });
    } else if (match[4] !== undefined) {
      nodes.push({ type: 'text', text: match[4], marks: [{ type: 'code' }] });
    } else if (match[5] !== undefined) {
      nodes.push({ type: 'text', text: match[5] });
    }
  }

  return nodes;
}

export function toADF(text: string): AdfDoc {
  const lines = text.split('\n');
  const content: AdfBlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      content.push({
        type: 'codeBlock',
        attrs: lang ? { language: lang } : {},
        content: [{ type: 'text', text: codeLines.join('\n') }],
      });
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      content.push({
        type: 'heading',
        attrs: { level },
        content: parseInline(headingText),
      });
      i++;
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(line)) {
      const items: AdfBlockNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*]\s+/, '');
        items.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseInline(itemText),
            },
          ],
        });
        i++;
      }
      content.push({ type: 'bulletList', content: items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: AdfBlockNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s+/, '');
        items.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseInline(itemText),
            },
          ],
        });
        i++;
      }
      content.push({ type: 'orderedList', content: items });
      continue;
    }

    // Markdown table
    if (isTableRow(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }

      const rows: AdfBlockNode[] = [];
      tableLines.forEach((tLine, rowIdx) => {
        if (isSeparatorRow(tLine)) return;

        const cellType = rowIdx === 0 ? 'tableHeader' : 'tableCell';
        const cells = parseTableRow(tLine).map(cellText => ({
          type: cellType,
          attrs: {},
          content: [{ type: 'paragraph', content: parseInline(cellText) }],
        }));

        rows.push({ type: 'tableRow', content: cells });
      });

      content.push({
        type: 'table',
        attrs: { isNumberColumnEnabled: false, layout: 'default' },
        content: rows,
      });
      continue;
    }

    // Empty line — paragraph separator, skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph
    content.push({
      type: 'paragraph',
      content: parseInline(line),
    });
    i++;
  }

  return { version: 1, type: 'doc', content };
}

// ─── Field Builder ───────────────────────────────────────────────────────────

export function buildFields(
  params: CommonIssueFields & {
    summary?: string;
    description?: string;
    projectKey?: string;
    issueType?: string;
  },
  includeProjectKey = false,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if (includeProjectKey && params.projectKey) {
    fields['project'] = { key: params.projectKey };
  }

  if (params.summary !== undefined) {
    fields['summary'] = params.summary;
  }

  // Build description ADF, appending acceptanceCriteria if provided
  let descriptionText = params.description ?? '';
  if (params.acceptanceCriteria) {
    const separator = descriptionText ? '\n\n' : '';
    descriptionText += `${separator}## Acceptance Criteria\n${params.acceptanceCriteria}`;
  }
  if (descriptionText) {
    fields['description'] = toADF(descriptionText);
  }

  if (params.issueType) {
    fields['issuetype'] = { name: params.issueType };
  }

  if (params.priority) {
    fields['priority'] = { name: params.priority };
  }

  if (params.assignee !== undefined) {
    fields['assignee'] = { name: params.assignee };
  }

  if (params.reporter !== undefined) {
    fields['reporter'] = { name: params.reporter };
  }

  if (params.labels !== undefined) {
    fields['labels'] = params.labels;
  }

  if (params.components !== undefined) {
    fields['components'] = params.components.map((c) => ({ name: c }));
  }

  if (params.fixVersions !== undefined) {
    fields['fixVersions'] = params.fixVersions.map((v) => ({ name: v }));
  }

  if (params.dueDate !== undefined) {
    fields['dueDate'] = params.dueDate;
  }

  if (params.storyPoints !== undefined) {
    fields['customfield_10016'] = params.storyPoints;
  }

  if (params.epicLink !== undefined) {
    fields['customfield_10014'] = params.epicLink;
  }

  if (params.sprint !== undefined) {
    fields['customfield_10020'] = params.sprint;
  }

  if (params.originalEstimate !== undefined) {
    fields['timetracking'] = { originalEstimate: params.originalEstimate };
  }

  if (params.environment !== undefined) {
    fields['environment'] = params.environment;
  }

  return fields;
}

// ─── JiraClient ──────────────────────────────────────────────────────────────

export class JiraClient {
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    const baseUrl = process.env['JIRA_BASE_URL'];
    const email = process.env['JIRA_EMAIL'];
    const token = process.env['JIRA_API_TOKEN'];

    if (!baseUrl || !email || !token) {
      throw new Error(
        'Missing required environment variables: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN',
      );
    }

    this.baseUrl = baseUrl.replace(/\/$/, '');
    const auth = Buffer.from(`${email}:${token}`).toString('base64');

    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  private extractJiraError(error: unknown): string {
    if (error instanceof AxiosError && error.response?.data) {
      const data = error.response.data as {
        errors?: Record<string, string>;
        errorMessages?: string[];
        message?: string;
      };
      const parts: string[] = [];
      if (data.errorMessages?.length) {
        parts.push(...data.errorMessages);
      }
      if (data.errors && Object.keys(data.errors).length) {
        parts.push(
          ...Object.entries(data.errors).map(([k, v]) => `${k}: ${v}`),
        );
      }
      if (data.message) {
        parts.push(data.message);
      }
      if (parts.length) return parts.join('; ');
    }
    return error instanceof Error ? error.message : String(error);
  }

  private isUnsupportedFieldError(error: unknown): {
    unsupported: boolean;
    fields: string[];
  } {
    if (error instanceof AxiosError && error.response?.status === 400) {
      const data = error.response.data as {
        errors?: Record<string, string>;
      };
      if (data.errors) {
        const unsupportedFields = Object.keys(data.errors).filter(
          (key) =>
            data.errors![key].toLowerCase().includes('field') ||
            data.errors![key].toLowerCase().includes('unknown') ||
            data.errors![key].toLowerCase().includes('not supported'),
        );
        if (unsupportedFields.length > 0) {
          return { unsupported: true, fields: unsupportedFields };
        }
      }
    }
    return { unsupported: false, fields: [] };
  }

  async createIssue(fields: Record<string, unknown>): Promise<CreateIssueResult> {
    const tryCreate = async (
      fieldsToUse: Record<string, unknown>,
    ): Promise<CreateIssueResult> => {
      try {
        const response = await this.http.post<{ id: string; key: string; self: string }>(
          '/rest/api/3/issue',
          { fields: fieldsToUse },
        );
        const { id, key } = response.data;
        return {
          id,
          key,
          url: `${this.baseUrl}/browse/${key}`,
        };
      } catch (error) {
        const { unsupported, fields: badFields } = this.isUnsupportedFieldError(error);
        if (unsupported && badFields.length > 0) {
          // Retry without the unsupported fields (once)
          const retryFields = { ...fieldsToUse };
          for (const f of badFields) {
            delete retryFields[f];
          }
          const retryResponse = await this.http.post<{
            id: string;
            key: string;
            self: string;
          }>('/rest/api/3/issue', { fields: retryFields });
          const { id, key } = retryResponse.data;
          return {
            id,
            key,
            url: `${this.baseUrl}/browse/${key}`,
          };
        }
        throw new Error(`Failed to create issue: ${this.extractJiraError(error)}`);
      }
    };

    return tryCreate(fields);
  }

  async getProjects(query?: string): Promise<JiraProject[]> {
    try {
      const params: Record<string, string> = {};
      if (query) params['query'] = query;

      const response = await this.http.get<{
        values: JiraProject[];
        total: number;
      }>('/rest/api/3/project/search', { params });

      return response.data.values;
    } catch (error) {
      throw new Error(`Failed to get projects: ${this.extractJiraError(error)}`);
    }
  }

  async getProjectById(projectKey: string): Promise<{ id: string; key: string; name: string }> {
    try {
      const response = await this.http.get<{ id: string; key: string; name: string }>(
        `/rest/api/3/project/${projectKey}`,
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get project ${projectKey}: ${this.extractJiraError(error)}`);
    }
  }

  async getIssueTypes(projectKey: string): Promise<JiraIssueType[]> {
    try {
      const project = await this.getProjectById(projectKey);
      const response = await this.http.get<JiraIssueType[]>(
        '/rest/api/3/issuetype/project',
        { params: { projectId: project.id } },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get issue types for ${projectKey}: ${this.extractJiraError(error)}`,
      );
    }
  }

  async updateIssue(
    issueKey: string,
    update: Record<string, unknown>,
  ): Promise<UpdateIssueResult> {
    const tryUpdate = async (
      updateToUse: Record<string, unknown>,
    ): Promise<UpdateIssueResult> => {
      try {
        await this.http.put(`/rest/api/3/issue/${issueKey}`, updateToUse);
        return {
          key: issueKey,
          url: `${this.baseUrl}/browse/${issueKey}`,
        };
      } catch (error) {
        const { unsupported, fields: badFields } = this.isUnsupportedFieldError(error);
        if (unsupported && badFields.length > 0) {
          // Retry without unsupported fields (once)
          const retryUpdate = { ...updateToUse } as Record<string, unknown>;
          if (retryUpdate['update'] && typeof retryUpdate['update'] === 'object') {
            const updateObj = { ...(retryUpdate['update'] as Record<string, unknown>) };
            for (const f of badFields) {
              delete updateObj[f];
            }
            retryUpdate['update'] = updateObj;
          }
          if (retryUpdate['fields'] && typeof retryUpdate['fields'] === 'object') {
            const fieldsObj = { ...(retryUpdate['fields'] as Record<string, unknown>) };
            for (const f of badFields) {
              delete fieldsObj[f];
            }
            retryUpdate['fields'] = fieldsObj;
          }
          await this.http.put(`/rest/api/3/issue/${issueKey}`, retryUpdate);
          return {
            key: issueKey,
            url: `${this.baseUrl}/browse/${issueKey}`,
          };
        }
        throw new Error(
          `Failed to update issue ${issueKey}: ${this.extractJiraError(error)}`,
        );
      }
    };

    return tryUpdate(update);
  }

  async addComment(
    issueKey: string,
    body: object,
  ): Promise<AddCommentResult> {
    try {
      const response = await this.http.post<{ id: string; self: string }>(
        `/rest/api/3/issue/${issueKey}/comment`,
        { body },
      );
      return {
        id: response.data.id,
        url: `${this.baseUrl}/browse/${issueKey}?focusedCommentId=${response.data.id}`,
      };
    } catch (error) {
      throw new Error(
        `Failed to add comment to ${issueKey}: ${this.extractJiraError(error)}`,
      );
    }
  }
}
