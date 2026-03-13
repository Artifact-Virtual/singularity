import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useApiState } from '@core/hooks/useApiState';
import {
  workflowsService, type WorkflowItem,
} from '@core/api/services';
import {
  Workflow,
  Plus,
  Pause,
  Clock,
  MoreHorizontal,
  Search,
  Filter,
  Edit,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@shared/utils';

// Status types
type WorkflowStatus = 'draft' | 'active' | 'paused' | 'error';

// Status badge component
function StatusBadge({ status }: { status: WorkflowStatus }) {
  const config = {
    draft: { icon: Edit, color: 'text-muted-foreground bg-muted', label: 'Draft' },
    active: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Active' },
    paused: { icon: Pause, color: 'text-yellow-600 bg-yellow-100', label: 'Paused' },
    error: { icon: XCircle, color: 'text-red-600 bg-red-100', label: 'Error' },
  };
  
  const { icon: Icon, color, label } = config[status];
  
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', color)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// Workflow card component
function WorkflowCard({ workflow }: { workflow: WorkflowItem }) {
  const navigate = useNavigate();
  
  return (
    <div
      className="rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/workflows/editor/${workflow.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Workflow className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{workflow.name}</h3>
            <p className="text-sm text-muted-foreground">{workflow.description || 'No description'}</p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Show dropdown menu
          }}
          className="p-1 rounded hover:bg-accent"
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <StatusBadge status={workflow.status as WorkflowStatus} />
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {workflow.trigger && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Scheduled
            </span>
          )}
          <span>{workflow.runCount} runs</span>
          {workflow.lastRunAt && (
            <span>Last run {formatRelativeTime(workflow.lastRunAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Main workflows list page
function WorkflowsListPage() {
  const navigate = useNavigate();
  const { items: workflows, add: addWorkflow } = useApiState<WorkflowItem>(
    workflowsService.list, workflowsService.create, workflowsService.update, workflowsService.delete
  );
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workflows</h1>
          <p className="text-muted-foreground">
            Automate tasks with drag-and-drop workflow builder
          </p>
        </div>
        <button
          onClick={async () => {
            const created = await addWorkflow({
              name: 'New Workflow',
              description: 'Configure this workflow',
              status: 'draft',
            } as Partial<WorkflowItem>);
            if (created) navigate(`/workflows/editor/${created.id}`);
          }}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Workflow
        </button>
      </div>
      
      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button className="h-10 px-4 rounded-md border border-input bg-background hover:bg-accent flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Workflows</p>
          <p className="text-2xl font-bold text-foreground">{workflows.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {workflows.filter((w) => w.status === 'active').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Executions</p>
          <p className="text-2xl font-bold text-foreground">
            {workflows.reduce((acc, w) => acc + w.runCount, 0)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Scheduled</p>
          <p className="text-2xl font-bold text-foreground">
            {workflows.filter((w) => w.trigger).length}
          </p>
        </div>
      </div>
      
      {/* Workflow list */}
      <div className="space-y-3">
        {filteredWorkflows.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No workflows match your search.' : 'No workflows yet.'}
            </p>
            <button
              onClick={() => navigate('/workflows/editor/new')}
              className="inline-flex items-center gap-2 mt-4 text-primary hover:underline"
            >
              <Plus className="h-4 w-4" />
              Create your first workflow
            </button>
          </div>
        ) : (
          filteredWorkflows.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))
        )}
      </div>
    </div>
  );
}

// Executions page
function ExecutionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Executions</h1>
        <p className="text-muted-foreground">View workflow execution history</p>
      </div>
      
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No executions yet.</p>
      </div>
    </div>
  );
}

// Main Workflows Module Router
export default function Workflows() {
  return (
    <Routes>
      <Route index element={<WorkflowsListPage />} />
      <Route path="executions" element={<ExecutionsPage />} />
      <Route path="editor/:id" element={<WorkflowEditorPage />} />
    </Routes>
  );
}

// Workflow Editor Page - Import from separate file
import WorkflowEditorPage from './editor/WorkflowEditorPage';
