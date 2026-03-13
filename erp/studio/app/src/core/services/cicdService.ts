/**
 * CI/CD Service
 * Native CI/CD pipeline management - No third-party dependencies
 * Self-hosted workflow execution engine
 */

// Pipeline status types
export type PipelineStatus = 'pending' | 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped';

// Job status types
export type JobStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped';

// Trigger types
export type TriggerType = 'push' | 'pull_request' | 'tag' | 'schedule' | 'manual' | 'webhook' | 'api';

// Runner types
export type RunnerType = 'local' | 'docker' | 'kubernetes' | 'ssh';

// Pipeline definition
export interface PipelineDefinition {
  id: string;
  name: string;
  description?: string;
  repository: string;
  branch?: string;
  triggers: TriggerConfig[];
  variables?: Record<string, string>;
  stages: StageDefinition[];
  timeout?: number; // minutes
  retryPolicy?: RetryPolicy;
  notifications?: NotificationConfig[];
  artifacts?: ArtifactConfig[];
  cache?: CacheConfig;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Trigger configuration
export interface TriggerConfig {
  type: TriggerType;
  branches?: string[]; // For push/PR triggers
  tags?: string[]; // For tag triggers
  schedule?: string; // Cron expression
  paths?: string[]; // File path patterns
  pathsIgnore?: string[]; // Paths to ignore
}

// Stage definition
export interface StageDefinition {
  name: string;
  dependsOn?: string[]; // Stage dependencies
  condition?: string; // Condition expression
  jobs: JobDefinition[];
}

// Job definition
export interface JobDefinition {
  id: string;
  name: string;
  runner: RunnerConfig;
  steps: StepDefinition[];
  environment?: Record<string, string>;
  timeout?: number; // minutes
  retryPolicy?: RetryPolicy;
  services?: ServiceConfig[];
  condition?: string;
  continueOnError?: boolean;
  matrix?: MatrixConfig;
}

// Step definition
export interface StepDefinition {
  name: string;
  id?: string;
  uses?: string; // Action reference
  run?: string; // Shell command
  shell?: 'bash' | 'sh' | 'powershell' | 'cmd' | 'python';
  workingDirectory?: string;
  environment?: Record<string, string>;
  with?: Record<string, string>; // Action inputs
  if?: string; // Condition
  timeout?: number; // minutes
  continueOnError?: boolean;
}

// Runner configuration
export interface RunnerConfig {
  type: RunnerType;
  labels?: string[];
  image?: string; // Docker image
  node?: string; // Kubernetes node selector
  sshHost?: string;
  resources?: {
    cpu?: string;
    memory?: string;
  };
}

// Service configuration (sidecar containers)
export interface ServiceConfig {
  name: string;
  image: string;
  ports?: number[];
  environment?: Record<string, string>;
  healthCheck?: {
    command: string;
    interval: number;
    retries: number;
  };
}

// Retry policy
export interface RetryPolicy {
  maxAttempts: number;
  delaySeconds?: number;
  backoffMultiplier?: number;
  retryOn?: JobStatus[];
}

// Matrix configuration for parallel jobs
export interface MatrixConfig {
  include?: Record<string, string[]>;
  exclude?: Record<string, string>[];
  failFast?: boolean;
}

// Artifact configuration
export interface ArtifactConfig {
  name: string;
  paths: string[];
  retentionDays?: number;
  when?: 'always' | 'on_success' | 'on_failure';
}

// Cache configuration
export interface CacheConfig {
  key: string;
  paths: string[];
  restoreKeys?: string[];
}

// Notification configuration
export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'teams';
  on: ('success' | 'failure' | 'always')[];
  recipients?: string[];
  webhookUrl?: string;
  channel?: string;
}

// Pipeline run instance
export interface PipelineRun {
  id: string;
  pipelineId: string;
  pipelineName: string;
  number: number;
  status: PipelineStatus;
  trigger: {
    type: TriggerType;
    ref?: string; // Branch/tag
    sha?: string; // Commit SHA
    actor?: string;
    message?: string;
  };
  stages: StageRun[];
  startedAt?: Date;
  finishedAt?: Date;
  duration?: number; // seconds
  variables?: Record<string, string>;
  artifacts?: ArtifactRun[];
  logs?: string;
}

// Stage run instance
export interface StageRun {
  name: string;
  status: PipelineStatus;
  jobs: JobRun[];
  startedAt?: Date;
  finishedAt?: Date;
  duration?: number;
}

// Job run instance
export interface JobRun {
  id: string;
  name: string;
  status: JobStatus;
  runner?: {
    id: string;
    name: string;
    type: RunnerType;
  };
  steps: StepRun[];
  startedAt?: Date;
  finishedAt?: Date;
  duration?: number;
  attempt: number;
  logs?: string;
  outputs?: Record<string, string>;
}

// Step run instance
export interface StepRun {
  name: string;
  status: JobStatus;
  startedAt?: Date;
  finishedAt?: Date;
  duration?: number;
  logs?: string;
  exitCode?: number;
  outputs?: Record<string, string>;
}

// Artifact run instance
export interface ArtifactRun {
  name: string;
  size: number;
  path: string;
  downloadUrl?: string;
  expiresAt?: Date;
}

// Runner instance
export interface Runner {
  id: string;
  name: string;
  type: RunnerType;
  status: 'online' | 'offline' | 'busy';
  labels: string[];
  os?: string;
  arch?: string;
  version?: string;
  currentJob?: string;
  lastHeartbeat?: Date;
  capabilities?: string[];
}

// Workflow secrets
export interface SecretConfig {
  name: string;
  scope: 'organization' | 'repository' | 'environment';
  environment?: string;
  repository?: string;
  createdAt: Date;
  updatedAt: Date;
  // Value is never exposed
}

/**
 * CI/CD Service Class
 * Native pipeline execution and management
 */
class CICDService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/cicd';
  }

  // ========== Pipeline Definitions ==========

  /**
   * List all pipeline definitions
   */
  async listPipelines(options?: {
    repository?: string;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PipelineDefinition[]> {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${this.baseUrl}/pipelines?${params}`);
    return response.json();
  }

  /**
   * Get a pipeline definition
   */
  async getPipeline(id: string): Promise<PipelineDefinition> {
    const response = await fetch(`${this.baseUrl}/pipelines/${id}`);
    return response.json();
  }

  /**
   * Create a new pipeline
   */
  async createPipeline(pipeline: Omit<PipelineDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<PipelineDefinition> {
    const response = await fetch(`${this.baseUrl}/pipelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pipeline),
    });
    return response.json();
  }

  /**
   * Update a pipeline
   */
  async updatePipeline(id: string, updates: Partial<PipelineDefinition>): Promise<PipelineDefinition> {
    const response = await fetch(`${this.baseUrl}/pipelines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.json();
  }

  /**
   * Delete a pipeline
   */
  async deletePipeline(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/pipelines/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Enable/disable a pipeline
   */
  async togglePipeline(id: string, enabled: boolean): Promise<PipelineDefinition> {
    return this.updatePipeline(id, { enabled });
  }

  // ========== Pipeline Runs ==========

  /**
   * List pipeline runs
   */
  async listRuns(options?: {
    pipelineId?: string;
    status?: PipelineStatus;
    branch?: string;
    limit?: number;
    offset?: number;
  }): Promise<PipelineRun[]> {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${this.baseUrl}/runs?${params}`);
    return response.json();
  }

  /**
   * Get a specific run
   */
  async getRun(id: string): Promise<PipelineRun> {
    const response = await fetch(`${this.baseUrl}/runs/${id}`);
    return response.json();
  }

  /**
   * Trigger a pipeline run
   */
  async triggerRun(pipelineId: string, options?: {
    branch?: string;
    sha?: string;
    variables?: Record<string, string>;
  }): Promise<PipelineRun> {
    const response = await fetch(`${this.baseUrl}/pipelines/${pipelineId}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return response.json();
  }

  /**
   * Cancel a running pipeline
   */
  async cancelRun(id: string): Promise<PipelineRun> {
    const response = await fetch(`${this.baseUrl}/runs/${id}/cancel`, {
      method: 'POST',
    });
    return response.json();
  }

  /**
   * Retry a failed pipeline
   */
  async retryRun(id: string, options?: {
    fromStage?: string;
    fromJob?: string;
  }): Promise<PipelineRun> {
    const response = await fetch(`${this.baseUrl}/runs/${id}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return response.json();
  }

  /**
   * Get run logs
   */
  async getRunLogs(runId: string, options?: {
    jobId?: string;
    stepIndex?: number;
    follow?: boolean;
  }): Promise<string> {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${this.baseUrl}/runs/${runId}/logs?${params}`);
    return response.text();
  }

  /**
   * Stream run logs (WebSocket)
   */
  streamLogs(runId: string, jobId?: string): WebSocket {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${this.baseUrl}/runs/${runId}/logs/stream${jobId ? `?jobId=${jobId}` : ''}`;
    return new WebSocket(wsUrl);
  }

  // ========== Artifacts ==========

  /**
   * List artifacts for a run
   */
  async listArtifacts(runId: string): Promise<ArtifactRun[]> {
    const response = await fetch(`${this.baseUrl}/runs/${runId}/artifacts`);
    return response.json();
  }

  /**
   * Download an artifact
   */
  async downloadArtifact(runId: string, artifactName: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/runs/${runId}/artifacts/${artifactName}/download`);
    return response.blob();
  }

  // ========== Runners ==========

  /**
   * List all runners
   */
  async listRunners(options?: {
    status?: 'online' | 'offline' | 'busy';
    labels?: string[];
  }): Promise<Runner[]> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.labels) options.labels.forEach(l => params.append('label', l));
    const response = await fetch(`${this.baseUrl}/runners?${params}`);
    return response.json();
  }

  /**
   * Register a new runner
   */
  async registerRunner(runner: {
    name: string;
    type: RunnerType;
    labels: string[];
    token?: string;
  }): Promise<{ runner: Runner; token: string }> {
    const response = await fetch(`${this.baseUrl}/runners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runner),
    });
    return response.json();
  }

  /**
   * Remove a runner
   */
  async removeRunner(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/runners/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update runner labels
   */
  async updateRunnerLabels(id: string, labels: string[]): Promise<Runner> {
    const response = await fetch(`${this.baseUrl}/runners/${id}/labels`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labels }),
    });
    return response.json();
  }

  // ========== Secrets ==========

  /**
   * List secrets
   */
  async listSecrets(scope: 'organization' | 'repository', repository?: string): Promise<SecretConfig[]> {
    const params = new URLSearchParams({ scope });
    if (repository) params.append('repository', repository);
    const response = await fetch(`${this.baseUrl}/secrets?${params}`);
    return response.json();
  }

  /**
   * Create a secret
   */
  async createSecret(secret: {
    name: string;
    value: string;
    scope: 'organization' | 'repository' | 'environment';
    repository?: string;
    environment?: string;
  }): Promise<SecretConfig> {
    const response = await fetch(`${this.baseUrl}/secrets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(secret),
    });
    return response.json();
  }

  /**
   * Update a secret
   */
  async updateSecret(name: string, value: string, scope: string, repository?: string): Promise<SecretConfig> {
    const params = new URLSearchParams({ scope });
    if (repository) params.append('repository', repository);
    const response = await fetch(`${this.baseUrl}/secrets/${name}?${params}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    return response.json();
  }

  /**
   * Delete a secret
   */
  async deleteSecret(name: string, scope: string, repository?: string): Promise<void> {
    const params = new URLSearchParams({ scope });
    if (repository) params.append('repository', repository);
    await fetch(`${this.baseUrl}/secrets/${name}?${params}`, {
      method: 'DELETE',
    });
  }

  // ========== Workflow Templates ==========

  /**
   * Get built-in workflow templates
   */
  async getTemplates(): Promise<{
    id: string;
    name: string;
    description: string;
    category: string;
    template: Partial<PipelineDefinition>;
  }[]> {
    const response = await fetch(`${this.baseUrl}/templates`);
    return response.json();
  }

  /**
   * Create pipeline from template
   */
  async createFromTemplate(templateId: string, overrides: Partial<PipelineDefinition>): Promise<PipelineDefinition> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overrides),
    });
    return response.json();
  }

  // ========== Statistics ==========

  /**
   * Get pipeline statistics
   */
  async getStats(options?: {
    pipelineId?: string;
    days?: number;
  }): Promise<{
    totalRuns: number;
    successRate: number;
    averageDuration: number;
    runsByStatus: Record<PipelineStatus, number>;
    runsByDay: { date: string; count: number; successRate: number }[];
  }> {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${this.baseUrl}/stats?${params}`);
    return response.json();
  }
}

// Export singleton instance
export const cicdService = new CICDService();
