import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import {
  Code2,
  GitBranch,
  Workflow,
  Rocket,
  Plus,
  Search,
  FolderGit2,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Settings,
  FileCode,
  GitCommit,
  GitPullRequest,
  Github,
  Gitlab,
  Link2,
  Trash2,
  RefreshCw,
  Shield,
  Network,
  Download,
} from 'lucide-react';
import { cn, formatRelativeTime, exportToCSV } from '@shared/utils';
import { useDataStore, type Project } from '@core/services/dataStore';
import { fileSystem } from '@core/services/fileSystem';
import { useApiState } from '@core/hooks/useApiState';
import {
  pipelinesService, deploymentsService,
  type Pipeline as APIPipeline, type Deployment as APIDeployment,
} from '@core/api/services';
import type { GitIntegration, GitProvider } from '@core/services/gitService';

// Project Form Modal
function ProjectForm({
  project,
  onSave,
  onCancel,
}: {
  project?: Project;
  onSave: (data: Partial<Project>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'planning' as Project['status'],
    priority: project?.priority || 'medium' as Project['priority'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border border-border w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {project ? 'Edit Project' : 'Create Project'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Project Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full h-24 px-3 py-2 mt-1 rounded-md border border-input bg-background resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
              className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-10 rounded-md border border-input bg-background hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {project ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Projects Page
function ProjectsPage() {
  const { projects, addProject, updateProject, deleteProject, loadProjects, isLoading } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = (data: Partial<Project>) => {
    if (editingProject) {
      updateProject(editingProject.id, data);
    } else {
      addProject({
        id: crypto.randomUUID(),
        ...data,
        startDate: new Date().toISOString(),
        progress: 0,
        employeeId: '',
      } as Project);
    }
    setShowForm(false);
    setEditingProject(undefined);
  };

  const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    planning: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    active: { icon: Play, color: 'text-green-600', bg: 'bg-green-100' },
    'on-hold': { icon: Pause, color: 'text-orange-600', bg: 'bg-orange-100' },
    completed: { icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-100' },
    cancelled: { icon: Pause, color: 'text-red-600', bg: 'bg-red-100' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">Manage your development projects</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
        <button
          onClick={() => exportToCSV(projects, 'projects', [
            { key: 'name', label: 'Name' },
            { key: 'description', label: 'Description' },
            { key: 'status', label: 'Status' },
            { key: 'priority', label: 'Priority' },
            { key: 'startDate', label: 'Start Date' },
            { key: 'endDate', label: 'End Date' },
            { key: 'createdAt', label: 'Created' },
          ])}
          className="h-10 px-4 rounded-md border border-input bg-background hover:bg-accent flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {(['planning', 'active', 'on-hold', 'completed'] as const).map((status) => {
          const config = statusConfig[status];
          const count = projects.filter((p) => p.status === status).length;
          return (
            <div key={status} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className={cn('p-1.5 rounded', config.bg)}>
                  <config.icon className={cn('h-4 w-4', config.color)} />
                </div>
                <p className="text-sm text-muted-foreground capitalize">{status}</p>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Projects grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full rounded-lg border border-border bg-card p-8 text-center">
            <FolderGit2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No projects found</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-primary hover:underline"
            >
              Create your first project
            </button>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const config = statusConfig[project.status] || { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' };
            return (
              <div
                key={project.id}
                className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FolderGit2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{project.name}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', config.bg, config.color)}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingProject(project);
                      setShowForm(true);
                    }}
                    className="p-2 rounded-md hover:bg-accent"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                  {project.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Started {formatRelativeTime(project.startDate)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {project.progress}% complete
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <ProjectForm
          project={editingProject}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingProject(undefined);
          }}
        />
      )}
    </div>
  );
}

// Repositories Page
function RepositoriesPage() {
  const [repos, setRepos] = useState<{ name: string; path: string }[]>([]);
  
  useEffect(() => {
    const loadRepos = async () => {
      const projects = await fileSystem.getProjects();
      setRepos(projects.map((p) => ({ name: p.name, path: p.path })));
    };
    loadRepos();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <GitBranch className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Repositories</h1>
          <p className="text-muted-foreground">Manage code repositories</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {repos.map((repo) => (
          <div key={repo.path} className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <GitBranch className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">{repo.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{repo.path}</p>
            <div className="flex gap-2 mt-4">
              <button className="text-sm text-primary hover:underline flex items-center gap-1">
                <GitCommit className="h-4 w-4" />
                Commits
              </button>
              <button className="text-sm text-primary hover:underline flex items-center gap-1">
                <GitPullRequest className="h-4 w-4" />
                Pull Requests
              </button>
            </div>
          </div>
        ))}
        {repos.length === 0 && (
          <div className="col-span-full rounded-lg border border-border bg-card p-8 text-center">
            <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No repositories detected</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Pipeline types
type PipelineStage = {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  duration?: number;
};

// Pipelines Page
function PipelinesPage() {
  const { items: pipelines, add: addPipeline } = useApiState<APIPipeline>(
    pipelinesService.list, pipelinesService.create, pipelinesService.update, pipelinesService.delete
  );
  const [showForm, setShowForm] = useState(false);

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: { label: 'Pending', color: 'text-muted-foreground', bgColor: 'bg-muted' },
    running: { label: 'Running', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    success: { label: 'Success', color: 'text-green-600', bgColor: 'bg-green-100' },
    failed: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
    cancelled: { label: 'Cancelled', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  };

  const stageStatusColors: Record<string, string> = {
    pending: 'bg-muted',
    running: 'bg-blue-500 animate-pulse',
    success: 'bg-green-500',
    failed: 'bg-red-500',
    skipped: 'bg-muted-foreground/40',
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const runningCount = pipelines.filter((p) => p.status === 'running').length;
  const successRate = pipelines.length > 0
    ? Math.round((pipelines.filter((p) => p.status === 'success').length / pipelines.filter((p) => ['success', 'failed'].includes(p.status)).length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Workflow className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">CI/CD Pipelines</h1>
            <p className="text-muted-foreground">Monitor and manage CI/CD pipelines</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Pipeline
        </button>
      </div>

      {/* Create Pipeline Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-foreground mb-4">New Pipeline</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const data = new FormData(form);
              await addPipeline({
                name: data.get('name') as string,
                repository: data.get('repository') as string || undefined,
                branch: data.get('branch') as string || 'main',
                trigger: data.get('trigger') as string || 'push',
                status: 'pending',
              });
              setShowForm(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Pipeline Name *</label>
                  <input name="name" required className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" placeholder="e.g. Build & Deploy" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Repository</label>
                  <input name="repository" className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" placeholder="e.g. github.com/org/repo" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Branch</label>
                    <input name="branch" defaultValue="main" className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Trigger</label>
                    <select name="trigger" defaultValue="push" className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground">
                      <option value="push">Push</option>
                      <option value="pull_request">Pull Request</option>
                      <option value="manual">Manual</option>
                      <option value="schedule">Schedule</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent text-foreground">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Create Pipeline</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Pipelines</p>
          <p className="text-2xl font-bold text-foreground">{pipelines.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Running</p>
          <p className="text-2xl font-bold text-blue-600">{runningCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Success Rate</p>
          <p className="text-2xl font-bold text-green-600">{successRate}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Failed Today</p>
          <p className="text-2xl font-bold text-red-600">
            {pipelines.filter((p) => p.status === 'failed').length}
          </p>
        </div>
      </div>

      {/* Pipelines list */}
      <div className="space-y-3">
        {pipelines.map((pipeline) => {
          const config = statusConfig[pipeline.status] || { label: pipeline.status, color: 'text-muted-foreground', bgColor: 'bg-muted' };
          return (
            <div
              key={pipeline.id}
              className="rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">{pipeline.name}</h3>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.bgColor, config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {pipeline.branch}
                    </span>
                    {pipeline.trigger && <span>by {pipeline.trigger}</span>}
                    {pipeline.lastRunAt && <span>{formatRelativeTime(pipeline.lastRunAt)}</span>}
                    {pipeline.duration && <span>{formatDuration(pipeline.duration)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pipeline.status === 'running' && (
                    <button className="px-3 py-1.5 rounded-md border border-input bg-background text-sm hover:bg-accent">
                      Cancel
                    </button>
                  )}
                  {pipeline.status === 'failed' && (
                    <button className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90">
                      Retry
                    </button>
                  )}
                </div>
              </div>

              {/* Pipeline stages */}
              <div className="mt-4 flex items-center gap-2">
                {(pipeline.stages || []).map((stage: any, index: number) => (
                  <div key={stage.name} className="flex items-center">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', stageStatusColors[stage.status])} />
                      <span className="text-sm text-foreground">{stage.name}</span>
                      {stage.duration && (
                        <span className="text-xs text-muted-foreground">({formatDuration(stage.duration)})</span>
                      )}
                    </div>
                    {index < (pipeline.stages || []).length - 1 && (
                      <div className="w-8 h-0.5 bg-border mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Deployment types
// Deployments Page
function DeploymentsPage() {
  const { items: deployments, update: updateDeployment, add: addDeployment } = useApiState<APIDeployment>(
    deploymentsService.list, deploymentsService.create, deploymentsService.update, deploymentsService.delete
  );
  const [filterEnv, setFilterEnv] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const filteredDeployments = deployments.filter(
    (d) => filterEnv === 'all' || d.environment === filterEnv
  );

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: { label: 'Pending', color: 'text-muted-foreground', bgColor: 'bg-muted' },
    deploying: { label: 'Deploying', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    success: { label: 'Success', color: 'text-green-600', bgColor: 'bg-green-100' },
    failed: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
    rolled_back: { label: 'Rolled Back', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  };

  const envConfig: Record<string, { label: string; color: string }> = {
    development: { label: 'Development', color: 'bg-muted text-muted-foreground' },
    staging: { label: 'Staging', color: 'bg-yellow-100 text-yellow-800' },
    production: { label: 'Production', color: 'bg-red-100 text-red-800' },
  };

  const handleRollback = (id: string) => {
    updateDeployment(id, { status: 'rolled_back' });
  };

  const handleRetry = (id: string) => {
    updateDeployment(id, { status: 'deploying' });
  };

  const productionDeployments = deployments.filter((d) => d.environment === 'production' && d.status === 'success');
  const activeDeployments = deployments.filter((d) => d.status === 'deploying').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Deployments</h1>
            <p className="text-muted-foreground">Manage application deployments</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Deployment
        </button>
      </div>

      {/* Create Deployment Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-foreground mb-4">New Deployment</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const data = new FormData(form);
              await addDeployment({
                version: data.get('version') as string,
                environment: data.get('environment') as string,
                deployedBy: data.get('deployedBy') as string || undefined,
                changelog: data.get('changelog') as string || undefined,
                status: 'pending',
              });
              setShowForm(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Version *</label>
                  <input name="version" required className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" placeholder="e.g. v1.2.3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Environment *</label>
                  <select name="environment" required className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground">
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                    <option value="testing">Testing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Deployed By</label>
                  <input name="deployedBy" className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" placeholder="e.g. CI/CD or username" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Changelog</label>
                  <textarea name="changelog" rows={3} className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground resize-none" placeholder="What changed in this deployment..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent text-foreground">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Deploy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Production Apps</p>
          <p className="text-2xl font-bold text-foreground">{productionDeployments.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active Deploys</p>
          <p className="text-2xl font-bold text-blue-600">{activeDeployments}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Success Rate</p>
          <p className="text-2xl font-bold text-green-600">
            {Math.round((deployments.filter((d) => d.status === 'success').length / deployments.length) * 100)}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Failed Today</p>
          <p className="text-2xl font-bold text-red-600">
            {deployments.filter((d) => d.status === 'failed').length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <select
          value={filterEnv}
          onChange={(e) => setFilterEnv(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background"
        >
          <option value="all">All Environments</option>
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="development">Development</option>
        </select>
      </div>

      {/* Deployments table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Application</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Environment</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Version</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Deployed</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeployments.map((deployment) => {
              const status = statusConfig[deployment.status] || { label: deployment.status, color: 'text-muted-foreground', bgColor: 'bg-muted' };
              const env = envConfig[deployment.environment] || { label: deployment.environment, color: 'text-muted-foreground' };
              return (
                <tr key={deployment.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-foreground">{deployment.version}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {deployment.environment}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', env.color)}>
                      {env.label}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-sm text-foreground">{deployment.version}</td>
                  <td className="p-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', status.bgColor, status.color)}>
                      {status.label}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <p className="text-foreground">{deployment.deployedBy || '—'}</p>
                      <p className="text-xs text-muted-foreground">{deployment.deployedAt ? formatRelativeTime(deployment.deployedAt) : '—'}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {deployment.changelog && (
                        <span
                          title={deployment.changelog}
                          className="p-2 rounded-md hover:bg-accent text-primary cursor-help"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </span>
                      )}
                      {deployment.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(deployment.id)}
                          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                        >
                          Retry
                        </button>
                      )}
                      {deployment.status === 'success' && deployment.environment === 'production' && (
                        <button
                          onClick={() => handleRollback(deployment.id)}
                          className="px-3 py-1.5 rounded-md border border-input bg-background text-sm hover:bg-accent"
                        >
                          Rollback
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Git Integrations Page
function GitIntegrationsPage() {
  const [integrations, setIntegrations] = useState<GitIntegration[]>([
    {
      id: 'int-1',
      name: 'Main GitHub Organization',
      provider: 'github',
      enabled: true,
      config: {
        owner: 'artifact-virtual',
        repo: 'studio',
        apiUrl: 'https://api.github.com',
      },
      webhookUrl: 'https://studio.artifactvirtual.com/api/webhooks/github',
      webhookEvents: ['push', 'pull_request', 'release'],
      lastActivity: new Date(Date.now() - 1000 * 60 * 30),
      status: 'connected',
    },
    {
      id: 'int-2',
      name: 'GitLab Self-Hosted',
      provider: 'gitlab',
      enabled: true,
      config: {
        projectId: 'artifact/internal-tools',
        apiUrl: 'https://gitlab.artifactvirtual.com',
      },
      webhookEvents: ['push', 'merge_request'],
      lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2),
      status: 'connected',
    },
    {
      id: 'int-3',
      name: 'Bitbucket Cloud',
      provider: 'bitbucket',
      enabled: false,
      config: {
        workspace: 'artifact-virtual',
        repoSlug: 'enterprise-apps',
      },
      status: 'disconnected',
    },
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<GitProvider>('github');
  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    repo: '',
    projectId: '',
    workspace: '',
    repoSlug: '',
    apiUrl: '',
    token: '',
  });

  const providerConfig = {
    github: { 
      name: 'GitHub', 
      icon: Github, 
      color: 'text-foreground',
      bgColor: 'bg-muted',
      fields: ['owner', 'repo', 'apiUrl', 'token']
    },
    gitlab: { 
      name: 'GitLab', 
      icon: Gitlab, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      fields: ['projectId', 'apiUrl', 'token']
    },
    bitbucket: { 
      name: 'Bitbucket', 
      icon: GitBranch, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      fields: ['workspace', 'repoSlug', 'apiUrl', 'token']
    },
    custom: { 
      name: 'Custom Git', 
      icon: FolderGit2, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      fields: ['apiUrl', 'token']
    },
  };

  const handleAddIntegration = () => {
    const newIntegration: GitIntegration = {
      id: `int-${Date.now()}`,
      name: formData.name,
      provider: selectedProvider,
      enabled: true,
      config: selectedProvider === 'github' 
        ? { owner: formData.owner, repo: formData.repo, apiUrl: formData.apiUrl || undefined }
        : selectedProvider === 'gitlab'
        ? { projectId: formData.projectId, apiUrl: formData.apiUrl || undefined }
        : { workspace: formData.workspace, repoSlug: formData.repoSlug },
      status: 'connected',
      lastActivity: new Date(),
    };
    setIntegrations([...integrations, newIntegration]);
    setShowAddForm(false);
    setFormData({ name: '', owner: '', repo: '', projectId: '', workspace: '', repoSlug: '', apiUrl: '', token: '' });
  };

  const handleToggle = (id: string) => {
    setIntegrations(integrations.map(i => 
      i.id === id ? { ...i, enabled: !i.enabled, status: i.enabled ? 'disconnected' : 'connected' } : i
    ));
  };

  const handleDelete = (id: string) => {
    setIntegrations(integrations.filter(i => i.id !== id));
  };

  const handleTest = (id: string) => {
    // Simulate testing
    setIntegrations(integrations.map(i => 
      i.id === id ? { ...i, status: 'connected', lastActivity: new Date() } : i
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Git Integrations</h1>
          <p className="text-muted-foreground">Connect your Git providers for seamless version control</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Integration
        </button>
      </div>

      {/* Provider Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        {(['github', 'gitlab', 'bitbucket', 'custom'] as GitProvider[]).map((provider) => {
          const config = providerConfig[provider];
          const count = integrations.filter(i => i.provider === provider).length;
          const activeCount = integrations.filter(i => i.provider === provider && i.enabled).length;
          return (
            <div key={provider} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className={cn('p-1.5 rounded', config.bgColor)}>
                  <config.icon className={cn('h-4 w-4', config.color)} />
                </div>
                <p className="text-sm font-medium text-foreground">{config.name}</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <span className="text-xs text-muted-foreground">{activeCount} active</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Integration List */}
      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Connected Integrations</h2>
        </div>
        <div className="divide-y divide-border">
          {integrations.map((integration) => {
            const config = providerConfig[integration.provider];
            return (
              <div key={integration.id} className="p-4 flex items-center gap-4">
                <div className={cn('p-2 rounded-lg', config.bgColor)}>
                  <config.icon className={cn('h-5 w-5', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{integration.name}</p>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      integration.status === 'connected' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      integration.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {integration.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {integration.provider === 'github' && `${(integration.config as { owner: string }).owner}/${(integration.config as { repo: string }).repo}`}
                    {integration.provider === 'gitlab' && (integration.config as { projectId: string }).projectId}
                    {integration.provider === 'bitbucket' && `${(integration.config as { workspace: string }).workspace}/${(integration.config as { repoSlug: string }).repoSlug}`}
                  </p>
                  {integration.lastActivity && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last activity: {formatRelativeTime(integration.lastActivity)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTest(integration.id)}
                    className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                    title="Test Connection"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggle(integration.id)}
                    className={cn(
                      'w-11 h-6 rounded-full relative transition-colors',
                      integration.enabled ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform',
                      integration.enabled ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                  <button
                    onClick={() => handleDelete(integration.id)}
                    className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600"
                    title="Remove Integration"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {integrations.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <FolderGit2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No integrations configured</p>
              <p className="text-sm mt-1">Connect your Git providers to enable seamless workflows</p>
            </div>
          )}
        </div>
      </div>

      {/* Webhook Configuration */}
      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Webhook Configuration</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
            <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Webhook Endpoint</p>
              <p className="text-sm text-muted-foreground mt-1">
                Configure your Git providers to send webhooks to this endpoint
              </p>
              <code className="mt-2 block text-sm font-mono bg-background px-3 py-2 rounded border border-input">
                https://studio.artifactvirtual.com/api/webhooks/git
              </code>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
            <Network className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Supported Events</p>
              <p className="text-sm text-muted-foreground mt-1">
                The following webhook events are processed by the CI/CD system:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {['push', 'pull_request', 'merge_request', 'tag', 'release', 'comment'].map(event => (
                  <span key={event} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {event}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Integration Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Git Integration</h2>
            
            {/* Provider Selection */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {(['github', 'gitlab', 'bitbucket', 'custom'] as GitProvider[]).map((provider) => {
                const config = providerConfig[provider];
                return (
                  <button
                    key={provider}
                    onClick={() => setSelectedProvider(provider)}
                    className={cn(
                      'p-3 rounded-lg border flex flex-col items-center gap-2 transition-colors',
                      selectedProvider === provider 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <config.icon className={cn('h-6 w-6', config.color)} />
                    <span className="text-xs font-medium">{config.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Integration Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                  placeholder="e.g., Main Repository"
                />
              </div>

              {selectedProvider === 'github' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Owner/Org</label>
                      <input
                        type="text"
                        value={formData.owner}
                        onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                        className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                        placeholder="artifact-virtual"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Repository</label>
                      <input
                        type="text"
                        value={formData.repo}
                        onChange={(e) => setFormData({ ...formData, repo: e.target.value })}
                        className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                        placeholder="studio"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">API URL (Optional, for GitHub Enterprise)</label>
                    <input
                      type="url"
                      value={formData.apiUrl}
                      onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                      className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                      placeholder="https://api.github.com"
                    />
                  </div>
                </>
              )}

              {selectedProvider === 'gitlab' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground">Project ID or Path</label>
                    <input
                      type="text"
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                      placeholder="group/project or 12345"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">API URL (for self-hosted)</label>
                    <input
                      type="url"
                      value={formData.apiUrl}
                      onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                      className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                      placeholder="https://gitlab.com or https://gitlab.yourcompany.com"
                    />
                  </div>
                </>
              )}

              {selectedProvider === 'bitbucket' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Workspace</label>
                    <input
                      type="text"
                      value={formData.workspace}
                      onChange={(e) => setFormData({ ...formData, workspace: e.target.value })}
                      className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                      placeholder="artifact-virtual"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Repository Slug</label>
                    <input
                      type="text"
                      value={formData.repoSlug}
                      onChange={(e) => setFormData({ ...formData, repoSlug: e.target.value })}
                      className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                      placeholder="my-repo"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground">Personal Access Token</label>
                <input
                  type="password"
                  value={formData.token}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                  className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                  placeholder="••••••••"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Token will be securely stored and never exposed
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 h-10 rounded-md border border-input bg-background hover:bg-accent font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIntegration}
                disabled={!formData.name}
                className="flex-1 h-10 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                Add Integration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Development Overview
function DevelopmentOverview() {
  const { projects, loadProjects } = useDataStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);
  
  const activeProjects = projects.filter((p) => p.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Code2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Development</h1>
          <p className="text-muted-foreground">Manage projects, repositories, and deployments</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Link to="/development/projects" className="rounded-lg border border-border bg-card p-6 hover:shadow-md">
          <FolderGit2 className="h-8 w-8 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{projects.length}</p>
          <p className="text-sm text-muted-foreground">Total Projects</p>
        </Link>
        <div className="rounded-lg border border-border bg-card p-6">
          <Play className="h-8 w-8 text-green-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{activeProjects.length}</p>
          <p className="text-sm text-muted-foreground">Active Projects</p>
        </div>
        <Link to="/development/repositories" className="rounded-lg border border-border bg-card p-6 hover:shadow-md">
          <GitBranch className="h-8 w-8 text-purple-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">1</p>
          <p className="text-sm text-muted-foreground">Repositories</p>
        </Link>
        <Link to="/development/deployments" className="rounded-lg border border-border bg-card p-6 hover:shadow-md">
          <Rocket className="h-8 w-8 text-orange-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">0</p>
          <p className="text-sm text-muted-foreground">Deployments</p>
        </Link>
        <Link to="/development/integrations" className="rounded-lg border border-border bg-card p-6 hover:shadow-md">
          <Link2 className="h-8 w-8 text-cyan-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">3</p>
          <p className="text-sm text-muted-foreground">Git Integrations</p>
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Active Projects</h2>
        {activeProjects.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No active projects</p>
        ) : (
          <div className="space-y-3">
            {activeProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <FolderGit2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600">Active</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Development() {
  return (
    <Routes>
      <Route index element={<DevelopmentOverview />} />
      <Route path="projects/*" element={<ProjectsPage />} />
      <Route path="repositories/*" element={<RepositoriesPage />} />
      <Route path="pipelines/*" element={<PipelinesPage />} />
      <Route path="deployments/*" element={<DeploymentsPage />} />
      <Route path="integrations/*" element={<GitIntegrationsPage />} />
    </Routes>
  );
}
