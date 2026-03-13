/**
 * Core Services Index
 * Central export for all service modules
 */

// Data Store Service
export { useDataStore, resetDataStore } from './dataStore';
export type {
  Contact,
  Deal,
  Employee,
  Project,
  Invoice,
  Activity,
  ActivityLog,
} from './dataStore';

// File System Service
export { fileSystem } from './fileSystem';
export type { FileInfo, ProjectInfo } from './fileSystem';

// CSV Data Service - Department data integration
export {
  CSV_DATA_SOURCES,
  parseExecutiveDashboard,
  parseHRDashboard,
  parseITInfrastructureDashboard,
  parseOperationsDashboard,
  loadAllDepartmentData,
  clearDepartmentDataCache,
  getDepartmentSummary,
} from './csvDataService';
export type {
  DepartmentType,
  DepartmentData,
  FinancialOverview,
  StrategicObjective,
  DepartmentPerformance,
  Risk,
  HeadcountData,
  RecruitmentPipeline,
  EmployeeRecord,
  InfrastructureAsset,
  SystemMetric,
  Incident,
  OperationalProcess,
  Vendor,
} from './csvDataService';

// Git Service - Version control integration
export { gitService } from './gitService';
export type {
  GitProvider,
  GitRepoConfig,
  GitCommit,
  GitBranch,
  GitFileStatus,
  GitPullRequest,
  GitWebhookPayload,
  GitHubConfig,
  GitLabConfig,
  BitbucketConfig,
  GitIntegration,
} from './gitService';

// CI/CD Service - Native pipeline management
export { cicdService } from './cicdService';
export type {
  PipelineStatus,
  JobStatus,
  TriggerType,
  RunnerType,
  PipelineDefinition,
  TriggerConfig,
  StageDefinition,
  JobDefinition,
  StepDefinition,
  RunnerConfig,
  ServiceConfig,
  RetryPolicy,
  MatrixConfig,
  ArtifactConfig,
  CacheConfig,
  NotificationConfig,
  PipelineRun,
  StageRun,
  JobRun,
  StepRun,
  ArtifactRun,
  Runner,
  SecretConfig,
} from './cicdService';

// Tailscale Service - VPN and secure networking
export { tailscaleService } from './tailscaleService';
export type {
  DeviceStatus,
  ConnectionStatus,
  TailscaleDevice,
  ACLRule,
  ACLConfig,
  DNSConfig,
  ExitNode,
  NetworkStats,
  SubnetRouter,
  AuthKey,
  TailnetInfo,
  ServiceAdvertisement,
} from './tailscaleService';
