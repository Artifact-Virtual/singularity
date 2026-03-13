import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import {
  Shield,
  Users,
  KeyRound,
  FileSearch,
  CheckCircle,
  AlertTriangle,
  Lock,
  Eye,
  Clock,
  Download,
} from 'lucide-react';
import { cn, formatRelativeTime, exportToCSV } from '@shared/utils';
import { useDataStore } from '@core/services/dataStore';
import { useAuth } from '@core/providers';

// Security Overview
function SecurityOverview() {
  const { user } = useAuth();
  const { activities, loadActivities } = useDataStore();

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const recentActivities = Array.isArray(activities) ? activities.slice(0, 5) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security</h1>
          <p className="text-muted-foreground">Security and access management</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Link to="/security/users" className="rounded-lg border border-border bg-card p-6 hover:shadow-md">
          <Users className="h-8 w-8 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">1</p>
          <p className="text-sm text-muted-foreground">Active Users</p>
        </Link>
        <Link to="/security/roles" className="rounded-lg border border-border bg-card p-6 hover:shadow-md">
          <KeyRound className="h-8 w-8 text-purple-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">3</p>
          <p className="text-sm text-muted-foreground">Roles</p>
        </Link>
        <Link to="/security/audit" className="rounded-lg border border-border bg-card p-6 hover:shadow-md">
          <FileSearch className="h-8 w-8 text-orange-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{activities.length}</p>
          <p className="text-sm text-muted-foreground">Audit Events</p>
        </Link>
        <div className="rounded-lg border border-border bg-card p-6">
          <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">100%</p>
          <p className="text-sm text-muted-foreground">Compliance</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Current Session</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-medium text-primary">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div>
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <span className="ml-auto text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                Active
              </span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="flex items-center gap-2"><Lock className="h-4 w-4" /> Role: Admin</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> Session started: Just now</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No recent activity
              </div>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{activity.subject}</p>
                    <p className="text-xs text-muted-foreground">{activity.type} • {activity.status}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(activity.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// User Management Page
function UsersPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">User</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Role</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                  <span className="font-medium">{user?.firstName} {user?.lastName}</span>
                </div>
              </td>
              <td className="p-4">{user?.email}</td>
              <td className="p-4">
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">Admin</span>
              </td>
              <td className="p-4">
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">Active</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Roles Page
function RolesPage() {
  const roles = [
    { name: 'Admin', description: 'Full system access', permissions: ['*'], users: 1 },
    { name: 'Manager', description: 'Team and project management', permissions: ['read', 'write', 'manage'], users: 0 },
    { name: 'User', description: 'Basic access', permissions: ['read', 'write'], users: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-muted-foreground">Role-based access control</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((role) => (
          <div key={role.name} className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{role.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{role.users} users</span>
              <span className="text-muted-foreground">{role.permissions.length} permissions</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Audit Page
function AuditPage() {
  const { activities } = useDataStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileSearch className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground">Activity and security logs</p>
        </div>
      </div>

      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => exportToCSV(activities, 'audit-logs', [
            { key: 'description', label: 'Action' },
            { key: 'userId', label: 'User' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'createdAt', label: 'Timestamp' },
          ])}
          className="h-9 px-3 rounded-md border border-input bg-background hover:bg-accent flex items-center gap-2 text-sm"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Action</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">User</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Time</th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-muted-foreground">
                  No audit events yet
                </td>
              </tr>
            ) : (
              activities.map((activity) => (
                <tr key={activity.id} className="border-t border-border">
                  <td className="p-4 font-medium">{activity.description}</td>
                  <td className="p-4 text-muted-foreground">{(activity as any).userName || activity.userId}</td>
                  <td className="p-4 text-muted-foreground">{formatRelativeTime(activity.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Compliance Page
function CompliancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <CheckCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance</h1>
          <p className="text-muted-foreground">Compliance monitoring</p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
        <p className="text-lg font-semibold text-foreground">All Systems Compliant</p>
        <p className="text-muted-foreground">No compliance issues detected</p>
      </div>
    </div>
  );
}

// GRC (Governance, Risk, Compliance) Page
const grcControls = [
  { id: 'G-01', category: 'Governance & Risk', control: 'Organizational Security Policy', status: 'compliant', priority: 'P1', owner: 'General Counsel', compliance: ['SOC2 CC1.1', 'ISO27001 A.5'] },
  { id: 'G-02', category: 'Governance & Risk', control: 'Risk Register & Treatment Plan', status: 'not_started', priority: 'P1', owner: 'CTO', compliance: ['SOC2 CC3.1', 'ISO27001 A.6'] },
  { id: 'G-03', category: 'Governance & Risk', control: 'Roles & Responsibilities', status: 'compliant', priority: 'P2', owner: 'HR Head', compliance: ['SOC2 CC1.3'] },
  { id: 'G-04', category: 'Governance & Risk', control: 'Vendor/Third-Party Risk Management', status: 'not_started', priority: 'P2', owner: 'COO', compliance: ['SOC2 CC9.2'] },
  { id: 'A-01', category: 'Architecture & Design', control: 'System Architecture Diagram', status: 'compliant', priority: 'P1', owner: 'CTO', compliance: ['SOC2 CC6.1'] },
  { id: 'A-02', category: 'Architecture & Design', control: 'Threat Modeling', status: 'in_progress', priority: 'P1', owner: 'Security', compliance: ['ISO27001 A.12'] },
  { id: 'N-04', category: 'Network & Infrastructure', control: 'Infrastructure as Code (IaC)', status: 'compliant', priority: 'P2', owner: 'DevOps', compliance: ['SOC2 CC8.1'] },
  { id: 'I-01', category: 'Identity & Access Management', control: 'Centralized Identity', status: 'compliant', priority: 'P0', owner: 'IT Infra', compliance: ['SOC2 CC6.1', 'ISO27001 A.9'] },
  { id: 'IR-01', category: 'Incident Response', control: 'Incident Response Plan', status: 'compliant', priority: 'P0', owner: 'Security', compliance: ['SOC2 CC7.4', 'ISO27001 A.16'] },
  { id: 'BCDR-01', category: 'Business Continuity', control: 'DR Plan', status: 'compliant', priority: 'P0', owner: 'COO', compliance: ['SOC2 CC7.3'] },
];

const risks = [
  { id: 'R-001', category: 'Operational', risk: 'Key Person Dependency', likelihood: 'High', impact: 'High', rating: 'Critical', mitigation: 'Cross-training and documentation', owner: 'HR Head', status: 'open' },
  { id: 'R-002', category: 'Technical', risk: 'Infrastructure Failure', likelihood: 'Low', impact: 'High', rating: 'Medium', mitigation: 'N+1 redundancy', owner: 'CTO', status: 'mitigated' },
  { id: 'R-003', category: 'Security', risk: 'Data Breach', likelihood: 'Medium', impact: 'Critical', rating: 'High', mitigation: 'Encryption, access controls', owner: 'Security', status: 'in_progress' },
  { id: 'R-004', category: 'Compliance', risk: 'Regulatory Non-Compliance', likelihood: 'Low', impact: 'Medium', rating: 'Low', mitigation: 'GRC framework implementation', owner: 'General Counsel', status: 'open' },
];

function GRCPage() {
  const [activeTab, setActiveTab] = useState<'controls' | 'risks' | 'frameworks'>('controls');
  
  const compliantCount = grcControls.filter(c => c.status === 'compliant').length;
  const inProgressCount = grcControls.filter(c => c.status === 'in_progress').length;
  const notStartedCount = grcControls.filter(c => c.status === 'not_started').length;
  const totalControls = grcControls.length;
  const readinessPercent = Math.round((compliantCount + inProgressCount * 0.5) / totalControls * 100);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'not_started': return 'bg-red-100 text-red-800';
      case 'mitigated': return 'bg-green-100 text-green-800';
      case 'open': return 'bg-red-100 text-red-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Critical': return 'text-red-600';
      case 'High': return 'text-orange-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">GRC Dashboard</h1>
          <p className="text-muted-foreground">Governance, Risk & Compliance Management</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-muted-foreground">Compliant</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{compliantCount}</p>
          <p className="text-xs text-muted-foreground">of {totalControls} controls</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-muted-foreground">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{inProgressCount}</p>
          <p className="text-xs text-muted-foreground">controls being implemented</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-muted-foreground">Not Started</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{notStartedCount}</p>
          <p className="text-xs text-muted-foreground">controls pending</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Readiness</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{readinessPercent}%</p>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: `${readinessPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('controls')}
          className={cn(
            'px-4 py-2 font-medium transition-colors',
            activeTab === 'controls' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
          )}
        >
          Controls
        </button>
        <button
          onClick={() => setActiveTab('risks')}
          className={cn(
            'px-4 py-2 font-medium transition-colors',
            activeTab === 'risks' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
          )}
        >
          Risk Register
        </button>
        <button
          onClick={() => setActiveTab('frameworks')}
          className={cn(
            'px-4 py-2 font-medium transition-colors',
            activeTab === 'frameworks' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
          )}
        >
          Frameworks
        </button>
      </div>

      {/* Controls Tab */}
      {activeTab === 'controls' && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">ID</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Category</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Control</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Priority</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Owner</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {grcControls.map((control) => (
                <tr key={control.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4 font-mono text-sm">{control.id}</td>
                  <td className="p-4 text-sm text-muted-foreground">{control.category}</td>
                  <td className="p-4 font-medium">{control.control}</td>
                  <td className="p-4">
                    <span className={cn('text-xs px-2 py-1 rounded-full', getStatusColor(control.status))}>
                      {control.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      'text-xs font-medium',
                      control.priority === 'P0' && 'text-red-600',
                      control.priority === 'P1' && 'text-orange-600',
                      control.priority === 'P2' && 'text-yellow-600'
                    )}>
                      {control.priority}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{control.owner}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {control.compliance.map((c) => (
                        <span key={c} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{c}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Risks Tab */}
      {activeTab === 'risks' && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">ID</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Category</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Risk</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Rating</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Mitigation</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Owner</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((risk) => (
                <tr key={risk.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4 font-mono text-sm">{risk.id}</td>
                  <td className="p-4 text-sm text-muted-foreground">{risk.category}</td>
                  <td className="p-4 font-medium">{risk.risk}</td>
                  <td className="p-4">
                    <span className={cn('font-semibold', getRatingColor(risk.rating))}>
                      {risk.rating}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {risk.likelihood} × {risk.impact}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground max-w-xs">{risk.mitigation}</td>
                  <td className="p-4 text-sm text-muted-foreground">{risk.owner}</td>
                  <td className="p-4">
                    <span className={cn('text-xs px-2 py-1 rounded-full', getStatusColor(risk.status))}>
                      {risk.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Frameworks Tab */}
      {activeTab === 'frameworks' && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold mb-2">SOC 2 Type II</h3>
            <p className="text-sm text-muted-foreground mb-4">Target: Q2 2027</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Readiness</span>
                <span className="font-medium">31%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '31%' }} />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Trust Service Criteria: CC1-CC9</p>
              <p>Controls mapped: 35</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold mb-2">ISO 27001:2022</h3>
            <p className="text-sm text-muted-foreground mb-4">Target: Q4 2027</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Readiness</span>
                <span className="font-medium">25%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '25%' }} />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Domains: A.5 - A.18</p>
              <p>Controls mapped: 28</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold mb-2">GDPR</h3>
            <p className="text-sm text-muted-foreground mb-4">Target: Q3 2026</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Readiness</span>
                <span className="font-medium">45%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '45%' }} />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Articles: Art.5, Art.17, Art.25, Art.32</p>
              <p>Controls mapped: 12</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Security() {
  return (
    <Routes>
      <Route index element={<SecurityOverview />} />
      <Route path="users/*" element={<UsersPage />} />
      <Route path="roles/*" element={<RolesPage />} />
      <Route path="audit/*" element={<AuditPage />} />
      <Route path="compliance/*" element={<CompliancePage />} />
      <Route path="grc/*" element={<GRCPage />} />
    </Routes>
  );
}
