/**
 * Git Service
 * Native Git operations for repository management
 * Supports GitHub, GitLab, and Bitbucket integrations
 */

// Git provider types
export type GitProvider = 'github' | 'gitlab' | 'bitbucket' | 'custom';

// Git repository configuration
export interface GitRepoConfig {
  id: string;
  name: string;
  provider: GitProvider;
  url: string;
  branch: string;
  isDefault: boolean;
  credentials?: {
    type: 'ssh' | 'token' | 'basic';
    // Credentials stored securely in backend
  };
  webhookSecret?: string;
  lastSync?: Date;
}

// Commit information
export interface GitCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: {
    name: string;
    email: string;
  };
  date: Date;
  parents: string[];
  stats?: {
    additions: number;
    deletions: number;
    files: number;
  };
}

// Branch information
export interface GitBranch {
  name: string;
  isRemote: boolean;
  isHead: boolean;
  commit: string;
  upstream?: string;
  behind?: number;
  ahead?: number;
}

// File status in working directory
export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'ignored';
  staged: boolean;
  oldPath?: string;
}

// Pull request information
export interface GitPullRequest {
  id: string;
  number: number;
  title: string;
  description: string;
  author: string;
  sourceBranch: string;
  targetBranch: string;
  status: 'open' | 'merged' | 'closed' | 'draft';
  createdAt: Date;
  updatedAt: Date;
  reviewers?: string[];
  labels?: string[];
  comments: number;
  commits: number;
  additions: number;
  deletions: number;
}

// Webhook payload types
export interface GitWebhookPayload {
  event: 'push' | 'pull_request' | 'merge' | 'tag' | 'release' | 'comment';
  repository: string;
  sender: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

// Provider-specific configuration
export interface GitHubConfig {
  owner: string;
  repo: string;
  apiUrl?: string; // For GitHub Enterprise
  personalAccessToken?: string;
  appId?: string;
  installationId?: string;
}

export interface GitLabConfig {
  projectId: string;
  apiUrl?: string; // For self-hosted GitLab
  personalAccessToken?: string;
}

export interface BitbucketConfig {
  workspace: string;
  repoSlug: string;
  apiUrl?: string;
  appPassword?: string;
}

// Integration configuration
export interface GitIntegration {
  id: string;
  name: string;
  provider: GitProvider;
  enabled: boolean;
  config: GitHubConfig | GitLabConfig | BitbucketConfig;
  webhookUrl?: string;
  webhookEvents?: string[];
  lastActivity?: Date;
  status: 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
}

/**
 * Git Service Class
 * Handles all Git operations through the backend API
 */
class GitService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/git';
  }

  // ========== Repository Operations ==========

  /**
   * Clone a repository
   */
  async clone(url: string, directory: string, options?: {
    branch?: string;
    depth?: number;
    credentials?: { type: string; value: string };
  }): Promise<{ success: boolean; path: string }> {
    const response = await fetch(`${this.baseUrl}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, directory, ...options }),
    });
    return response.json();
  }

  /**
   * Initialize a new repository
   */
  async init(directory: string, options?: {
    bare?: boolean;
    defaultBranch?: string;
  }): Promise<{ success: boolean; path: string }> {
    const response = await fetch(`${this.baseUrl}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory, ...options }),
    });
    return response.json();
  }

  // ========== Branch Operations ==========

  /**
   * List all branches
   */
  async listBranches(repoId: string): Promise<GitBranch[]> {
    const response = await fetch(`${this.baseUrl}/${repoId}/branches`);
    return response.json();
  }

  /**
   * Create a new branch
   */
  async createBranch(repoId: string, branchName: string, fromRef?: string): Promise<GitBranch> {
    const response = await fetch(`${this.baseUrl}/${repoId}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: branchName, from: fromRef }),
    });
    return response.json();
  }

  /**
   * Delete a branch
   */
  async deleteBranch(repoId: string, branchName: string, force?: boolean): Promise<void> {
    await fetch(`${this.baseUrl}/${repoId}/branches/${branchName}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    });
  }

  /**
   * Checkout a branch
   */
  async checkout(repoId: string, branchOrCommit: string, options?: {
    create?: boolean;
    force?: boolean;
  }): Promise<void> {
    await fetch(`${this.baseUrl}/${repoId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: branchOrCommit, ...options }),
    });
  }

  /**
   * Merge branches
   */
  async merge(repoId: string, sourceBranch: string, options?: {
    message?: string;
    strategy?: 'recursive' | 'ours' | 'theirs';
    noFastForward?: boolean;
  }): Promise<{ success: boolean; commit?: string; conflicts?: string[] }> {
    const response = await fetch(`${this.baseUrl}/${repoId}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: sourceBranch, ...options }),
    });
    return response.json();
  }

  // ========== Commit Operations ==========

  /**
   * Get commit history
   */
  async getCommits(repoId: string, options?: {
    branch?: string;
    limit?: number;
    offset?: number;
    since?: Date;
    until?: Date;
    author?: string;
    path?: string;
  }): Promise<GitCommit[]> {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value instanceof Date ? value.toISOString() : String(value));
        }
      });
    }
    const response = await fetch(`${this.baseUrl}/${repoId}/commits?${params}`);
    return response.json();
  }

  /**
   * Get a specific commit
   */
  async getCommit(repoId: string, sha: string): Promise<GitCommit> {
    const response = await fetch(`${this.baseUrl}/${repoId}/commits/${sha}`);
    return response.json();
  }

  /**
   * Stage files
   */
  async stage(repoId: string, paths: string[]): Promise<void> {
    await fetch(`${this.baseUrl}/${repoId}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    });
  }

  /**
   * Unstage files
   */
  async unstage(repoId: string, paths: string[]): Promise<void> {
    await fetch(`${this.baseUrl}/${repoId}/unstage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    });
  }

  /**
   * Create a commit
   */
  async commit(repoId: string, message: string, options?: {
    amend?: boolean;
    author?: { name: string; email: string };
  }): Promise<GitCommit> {
    const response = await fetch(`${this.baseUrl}/${repoId}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, ...options }),
    });
    return response.json();
  }

  // ========== Remote Operations ==========

  /**
   * Pull from remote
   */
  async pull(repoId: string, options?: {
    remote?: string;
    branch?: string;
    rebase?: boolean;
  }): Promise<{ success: boolean; commits?: number; conflicts?: string[] }> {
    const response = await fetch(`${this.baseUrl}/${repoId}/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return response.json();
  }

  /**
   * Push to remote
   */
  async push(repoId: string, options?: {
    remote?: string;
    branch?: string;
    force?: boolean;
    setUpstream?: boolean;
    tags?: boolean;
  }): Promise<{ success: boolean; pushed?: number }> {
    const response = await fetch(`${this.baseUrl}/${repoId}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return response.json();
  }

  /**
   * Fetch from remote
   */
  async fetch(repoId: string, options?: {
    remote?: string;
    prune?: boolean;
    tags?: boolean;
  }): Promise<void> {
    await fetch(`${this.baseUrl}/${repoId}/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
  }

  // ========== Status & Diff ==========

  /**
   * Get repository status
   */
  async getStatus(repoId: string): Promise<{
    branch: string;
    ahead: number;
    behind: number;
    files: GitFileStatus[];
  }> {
    const response = await fetch(`${this.baseUrl}/${repoId}/status`);
    return response.json();
  }

  /**
   * Get diff for files
   */
  async getDiff(repoId: string, options?: {
    staged?: boolean;
    commit?: string;
    paths?: string[];
  }): Promise<string> {
    const params = new URLSearchParams();
    if (options?.staged) params.append('staged', 'true');
    if (options?.commit) params.append('commit', options.commit);
    if (options?.paths) options.paths.forEach(p => params.append('path', p));
    
    const response = await fetch(`${this.baseUrl}/${repoId}/diff?${params}`);
    return response.text();
  }

  // ========== Tag Operations ==========

  /**
   * List tags
   */
  async listTags(repoId: string): Promise<{ name: string; commit: string; message?: string; date?: Date }[]> {
    const response = await fetch(`${this.baseUrl}/${repoId}/tags`);
    return response.json();
  }

  /**
   * Create a tag
   */
  async createTag(repoId: string, name: string, options?: {
    commit?: string;
    message?: string;
    annotated?: boolean;
  }): Promise<{ name: string; commit: string }> {
    const response = await fetch(`${this.baseUrl}/${repoId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ...options }),
    });
    return response.json();
  }

  /**
   * Delete a tag
   */
  async deleteTag(repoId: string, name: string): Promise<void> {
    await fetch(`${this.baseUrl}/${repoId}/tags/${name}`, {
      method: 'DELETE',
    });
  }

  // ========== Provider Integrations ==========

  /**
   * List configured integrations
   */
  async listIntegrations(): Promise<GitIntegration[]> {
    const response = await fetch(`${this.baseUrl}/integrations`);
    return response.json();
  }

  /**
   * Add a new integration
   */
  async addIntegration(integration: Omit<GitIntegration, 'id' | 'status'>): Promise<GitIntegration> {
    const response = await fetch(`${this.baseUrl}/integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(integration),
    });
    return response.json();
  }

  /**
   * Update an integration
   */
  async updateIntegration(id: string, updates: Partial<GitIntegration>): Promise<GitIntegration> {
    const response = await fetch(`${this.baseUrl}/integrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.json();
  }

  /**
   * Remove an integration
   */
  async removeIntegration(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/integrations/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Test integration connection
   */
  async testIntegration(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${this.baseUrl}/integrations/${id}/test`, {
      method: 'POST',
    });
    return response.json();
  }

  // ========== Pull Requests ==========

  /**
   * List pull requests
   */
  async listPullRequests(repoId: string, options?: {
    state?: 'open' | 'closed' | 'all';
    author?: string;
    limit?: number;
  }): Promise<GitPullRequest[]> {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${this.baseUrl}/${repoId}/pull-requests?${params}`);
    return response.json();
  }

  /**
   * Create a pull request
   */
  async createPullRequest(repoId: string, data: {
    title: string;
    description?: string;
    sourceBranch: string;
    targetBranch: string;
    reviewers?: string[];
    labels?: string[];
    draft?: boolean;
  }): Promise<GitPullRequest> {
    const response = await fetch(`${this.baseUrl}/${repoId}/pull-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * Merge a pull request
   */
  async mergePullRequest(repoId: string, prNumber: number, options?: {
    method?: 'merge' | 'squash' | 'rebase';
    message?: string;
    deleteSourceBranch?: boolean;
  }): Promise<{ success: boolean; commit?: string }> {
    const response = await fetch(`${this.baseUrl}/${repoId}/pull-requests/${prNumber}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return response.json();
  }

  // ========== Webhooks ==========

  /**
   * Register a webhook
   */
  async registerWebhook(integrationId: string, events: string[]): Promise<{
    id: string;
    url: string;
    secret: string;
  }> {
    const response = await fetch(`${this.baseUrl}/integrations/${integrationId}/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
    return response.json();
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(payload: GitWebhookPayload): Promise<void> {
    await fetch(`${this.baseUrl}/webhooks/handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
}

// Export singleton instance
export const gitService = new GitService();
