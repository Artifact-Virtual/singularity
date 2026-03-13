import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { usePersistedState } from '@core/hooks/usePersistedState';
import {
  BarChart3,
  LayoutDashboard,
  FileBarChart,
  Target,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  ArrowUpRight,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Calendar,
  Clock,
  PlayCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { cn, formatCurrency, formatRelativeTime } from '@shared/utils';
import { useDataStore } from '@core/services/dataStore';
import { useEffect } from 'react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Analytics Overview
function AnalyticsOverview() {
  const { contacts, deals, employees, invoices, projects, loadAllData } = useDataStore();

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const totalRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);

  const pipelineValue = deals
    .filter((d) => !['closed-won', 'closed-lost'].includes(d.stage))
    .reduce((sum, d) => sum + d.value, 0);

  const dealsByStage = [
    { name: 'Discovery', value: deals.filter((d) => d.stage === 'lead').length },
    { name: 'Proposal', value: deals.filter((d) => d.stage === 'proposal').length },
    { name: 'Negotiation', value: deals.filter((d) => d.stage === 'negotiation').length },
    { name: 'Won', value: deals.filter((d) => d.stage === 'closed-won').length },
    { name: 'Lost', value: deals.filter((d) => d.stage === 'closed-lost').length },
  ].filter((d) => d.value > 0);

  const contactsByStatus = [
    { name: 'Leads', value: contacts.filter((c) => c.status === 'lead').length },
    { name: 'Active', value: contacts.filter((c) => c.status === 'active').length },
    { name: 'Inactive', value: contacts.filter((c) => c.status === 'inactive').length },
  ].filter((d) => d.value > 0);

  // Build monthly data from real invoices
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthRevenue = invoices
      .filter(inv => {
        if (inv.status !== 'paid' || !inv.paidDate) return false;
        const paid = new Date(inv.paidDate);
        return `${paid.getFullYear()}-${String(paid.getMonth() + 1).padStart(2, '0')}` === monthKey;
      })
      .reduce((sum, inv) => sum + inv.amount, 0);
    const monthDeals = deals.filter(deal => {
      const created = new Date(deal.createdAt);
      return `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}` === monthKey;
    }).length;
    return { month: monthNames[d.getMonth()], revenue: monthRevenue, deals: monthDeals };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Business intelligence and analytics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <DollarSign className="h-8 w-8 text-green-600" />
            <span className="flex items-center text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4" />
              12%
            </span>
          </div>
          <p className="text-2xl font-bold mt-2">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-muted-foreground">Total Revenue</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <span className="flex items-center text-sm text-blue-600">
              <ArrowUpRight className="h-4 w-4" />
              8%
            </span>
          </div>
          <p className="text-2xl font-bold mt-2">{formatCurrency(pipelineValue)}</p>
          <p className="text-sm text-muted-foreground">Pipeline Value</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <Users className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-2xl font-bold mt-2">{contacts.length}</p>
          <p className="text-sm text-muted-foreground">Total Contacts</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <Activity className="h-8 w-8 text-orange-600" />
          </div>
          <p className="text-2xl font-bold mt-2">{projects.filter((p) => p.status === 'active').length}</p>
          <p className="text-sm text-muted-foreground">Active Projects</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold mb-4">Revenue Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
                <XAxis dataKey="month" stroke="hsl(var(--color-muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--color-muted-foreground))" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deals by Stage */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold mb-4">Deals by Stage</h3>
          <div className="h-64">
            {dealsByStage.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No deals data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dealsByStage}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dealsByStage.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Contacts by Status */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold mb-4">Contacts by Status</h3>
          <div className="h-64">
            {contactsByStatus.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No contacts data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contactsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--color-muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--color-muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Monthly Deals */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold mb-4">Monthly Deals</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
                <XAxis dataKey="month" stroke="hsl(var(--color-muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--color-muted-foreground))" fontSize={12} />
                <Tooltip />
                <Bar dataKey="deals" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard types
type Dashboard = {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;
};

type DashboardWidget = {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'list';
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
};

// Dashboards Page
function DashboardsPage() {
  const [dashboards, setDashboards] = usePersistedState<Dashboard[]>('analytics-dashboards', []);
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);

  const handleCreateDashboard = () => {
    const newDashboard: Dashboard = {
      id: crypto.randomUUID(),
      name: 'New Dashboard',
      description: 'Custom dashboard',
      widgets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setDashboards([newDashboard, ...dashboards]);
  };

  const handleDelete = (id: string) => {
    setDashboards(dashboards.filter((d) => d.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setDashboards(dashboards.map((d) => ({
      ...d,
      isDefault: d.id === id,
    })));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboards</h1>
            <p className="text-muted-foreground">Custom dashboard builder</p>
          </div>
        </div>
        <button
          onClick={handleCreateDashboard}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Dashboard
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Dashboards</p>
          <p className="text-2xl font-bold text-foreground">{dashboards.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Widgets</p>
          <p className="text-2xl font-bold text-blue-600">
            {dashboards.reduce((sum, d) => sum + d.widgets.length, 0)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Last Updated</p>
          <p className="text-2xl font-bold text-foreground">Today</p>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((dashboard) => (
          <div
            key={dashboard.id}
            className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{dashboard.name}</h3>
                  {dashboard.isDefault && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{dashboard.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <span>{dashboard.widgets.length} widgets</span>
              <span>Updated {formatRelativeTime(dashboard.updatedAt)}</span>
            </div>

            {/* Widget Preview */}
            <div className="grid grid-cols-6 gap-1 mb-4 h-16 bg-muted/50 rounded-lg p-2">
              {dashboard.widgets.slice(0, 3).map((widget) => (
                <div
                  key={widget.id}
                  className="bg-primary/20 rounded"
                  style={{
                    gridColumn: `span ${Math.min(widget.position.w, 3)}`,
                    gridRow: `span ${widget.position.h}`,
                  }}
                />
              ))}
            </div>

            <div className="flex gap-2 pt-4 border-t border-border">
              <button className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 flex items-center justify-center gap-2">
                <Eye className="h-4 w-4" />
                View
              </button>
              <button className="h-9 px-3 rounded-md border border-input bg-background hover:bg-accent" onClick={() => alert('Dashboard editing coming soon')}>
                <Edit className="h-4 w-4" />
              </button>
              {!dashboard.isDefault && (
                <button
                  onClick={() => handleDelete(dashboard.id)}
                  className="h-9 px-3 rounded-md border border-input bg-background hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Report types
type Report = {
  id: string;
  name: string;
  description: string;
  type: 'financial' | 'sales' | 'marketing' | 'hr' | 'custom';
  format: 'pdf' | 'excel' | 'csv';
  schedule?: 'daily' | 'weekly' | 'monthly';
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
};

// Reports Page
function ReportsPage() {
  const [reports, setReports] = usePersistedState<Report[]>('analytics-reports', []);
  const [filterType, setFilterType] = useState<string>('all');

  const filteredReports = reports.filter(
    (r) => filterType === 'all' || r.type === filterType
  );

  const typeConfig: Record<Report['type'], { label: string; color: string }> = {
    financial: { label: 'Financial', color: 'bg-green-100 text-green-800' },
    sales: { label: 'Sales', color: 'bg-blue-100 text-blue-800' },
    marketing: { label: 'Marketing', color: 'bg-purple-100 text-purple-800' },
    hr: { label: 'HR', color: 'bg-orange-100 text-orange-800' },
    custom: { label: 'Custom', color: 'bg-muted text-muted-foreground' },
  };

  const formatConfig: Record<Report['format'], string> = {
    pdf: 'PDF',
    excel: 'Excel',
    csv: 'CSV',
  };

  const handleCreateReport = () => {
    const newReport: Report = {
      id: crypto.randomUUID(),
      name: 'New Report',
      description: 'Custom report',
      type: 'custom',
      format: 'pdf',
      createdAt: new Date(),
    };
    setReports([newReport, ...reports]);
  };

  const handleRunReport = (id: string) => {
    setReports(reports.map((r) =>
      r.id === id ? { ...r, lastRun: new Date() } : r
    ));
  };

  const scheduledReports = reports.filter((r) => r.schedule).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileBarChart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground">Generate and schedule reports</p>
          </div>
        </div>
        <button
          onClick={handleCreateReport}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Reports</p>
          <p className="text-2xl font-bold text-foreground">{reports.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Scheduled</p>
          <p className="text-2xl font-bold text-blue-600">{scheduledReports}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Run This Week</p>
          <p className="text-2xl font-bold text-green-600">
            {reports.filter((r) => r.lastRun && r.lastRun > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Report Types</p>
          <p className="text-2xl font-bold text-foreground">
            {new Set(reports.map((r) => r.type)).size}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background"
        >
          <option value="all">All Types</option>
          <option value="financial">Financial</option>
          <option value="sales">Sales</option>
          <option value="marketing">Marketing</option>
          <option value="hr">HR</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Reports Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Report</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Format</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Schedule</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Run</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((report) => (
              <tr key={report.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-4">
                  <div>
                    <p className="font-medium text-foreground">{report.name}</p>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', typeConfig[report.type]?.color)}>
                    {typeConfig[report.type]?.label || report.type}
                  </span>
                </td>
                <td className="p-4 text-foreground">{formatConfig[report.format] || report.format}</td>
                <td className="p-4">
                  {report.schedule ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="capitalize">{report.schedule}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Manual</span>
                  )}
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {report.lastRun ? formatRelativeTime(report.lastRun) : 'Never'}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleRunReport(report.id)}
                      className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 flex items-center gap-1"
                    >
                      <PlayCircle className="h-3 w-3" />
                      Run
                    </button>
                    <button className="p-2 rounded-md hover:bg-accent" onClick={() => alert('Report download will be available when report data is generated')}>
                      <Download className="h-4 w-4" />
                    </button>
                    <button className="p-2 rounded-md hover:bg-accent" onClick={() => alert('Report editing coming in next release')}>
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setReports(reports.filter((r) => r.id !== report.id))}
                      className="p-2 rounded-md hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// KPIs Page
function KPIsPage() {
  const { contacts, deals, employees, invoices, loadAllData } = useDataStore();

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const kpis = [
    {
      name: 'Customer Acquisition',
      value: contacts.filter((c) => c.status === 'active').length,
      target: 100,
      unit: 'customers',
    },
    {
      name: 'Deal Conversion Rate',
      value: deals.length > 0 
        ? Math.round((deals.filter((d) => d.stage === 'closed-won').length / deals.length) * 100) 
        : 0,
      target: 30,
      unit: '%',
    },
    {
      name: 'Revenue',
      value: invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
      target: 100000,
      unit: '$',
      isCurrency: true,
    },
    {
      name: 'Team Size',
      value: employees.filter((e) => e.status === 'active').length,
      target: 50,
      unit: 'employees',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">KPIs</h1>
          <p className="text-muted-foreground">Key performance indicators</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {kpis.map((kpi) => {
          const progress = Math.min((kpi.value / kpi.target) * 100, 100);
          const isOnTrack = progress >= 70;
          return (
            <div key={kpi.name} className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{kpi.name}</h3>
                <span className={cn(
                  'text-xs px-2 py-1 rounded-full',
                  isOnTrack ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                )}>
                  {isOnTrack ? 'On Track' : 'Behind'}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold">
                  {kpi.isCurrency ? formatCurrency(kpi.value) : kpi.value.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {kpi.isCurrency ? formatCurrency(kpi.target) : kpi.target.toLocaleString()} {!kpi.isCurrency && kpi.unit}
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', isOnTrack ? 'bg-green-500' : 'bg-yellow-500')}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}% of target</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Analytics() {
  return (
    <Routes>
      <Route index element={<AnalyticsOverview />} />
      <Route path="dashboards/*" element={<DashboardsPage />} />
      <Route path="reports/*" element={<ReportsPage />} />
      <Route path="kpis/*" element={<KPIsPage />} />
    </Routes>
  );
}
