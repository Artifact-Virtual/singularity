import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  FolderGit2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn, formatCurrency, formatRelativeTime } from '@shared/utils';
import { useDataStore } from '@core/services/dataStore';
import { useAuth } from '@core/providers';

export default function Dashboard() {
  const { user } = useAuth();
  const { 
    contacts, 
    deals, 
    employees, 
    projects, 
    invoices,
    activities,
    loadAllData,
    isLoading,
  } = useDataStore();

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Ensure arrays are always defined (defensive coding for API failures)
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safeDeals = Array.isArray(deals) ? deals : [];
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeContacts = Array.isArray(contacts) ? contacts : [];
  const safeActivities = Array.isArray(activities) ? activities : [];

  // Calculate real stats
  const totalRevenue = safeInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);
  
  const openDeals = safeDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage));
  const pipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  
  const activeProjects = safeProjects.filter(p => p.status === 'active').length;
  const activeEmployees = safeEmployees.filter(e => e.status === 'active').length;

  // Build revenue chart from real invoice data
  const revenueData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const months: { month: string; revenue: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthRevenue = safeInvoices
        .filter(inv => {
          if (inv.status !== 'paid' || !inv.paidDate) return false;
          const paid = new Date(inv.paidDate);
          return `${paid.getFullYear()}-${String(paid.getMonth() + 1).padStart(2, '0')}` === monthKey;
        })
        .reduce((sum, inv) => sum + inv.amount, 0);
      
      months.push({ month: monthNames[d.getMonth()], revenue: monthRevenue });
    }
    
    return months;
  }, [safeInvoices]);

  const stats = [
    {
      name: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      subtext: `${safeInvoices.filter(i => i.status === 'paid').length} paid invoices`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      href: '/finance',
    },
    {
      name: 'Pipeline Value',
      value: formatCurrency(pipelineValue),
      subtext: `${openDeals.length} open deal${openDeals.length !== 1 ? 's' : ''}`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      href: '/crm/deals',
    },
    {
      name: 'Active Projects',
      value: activeProjects.toString(),
      subtext: `${safeProjects.length} total projects`,
      icon: FolderGit2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      href: '/development/projects',
    },
    {
      name: 'Team Members',
      value: activeEmployees.toString(),
      subtext: `${safeEmployees.length} total employees`,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      href: '/hrm/employees',
    },
  ];

  const recentActivities = safeActivities.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.firstName || 'User'}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your organization today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/crm/contacts"
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </span>
              <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-foreground">
                {stat.value}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.subtext}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue chart */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Revenue Overview
              </h2>
              <p className="text-sm text-muted-foreground">
                Monthly revenue trend
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--color-primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--color-primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--color-muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--color-muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--color-card))',
                    border: '1px solid hsl(var(--color-border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--color-primary))"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Recent Activity
              </h2>
              <p className="text-sm text-muted-foreground">
                Latest actions in your organization
              </p>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-xs">Actions will appear here as you work</p>
              </div>
            ) : (
              recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                >
                  <div className={cn(
                    'p-1.5 rounded-full mt-0.5',
                    activity.type === 'call' && 'bg-blue-100 text-blue-600',
                    activity.type === 'email' && 'bg-green-100 text-green-600',
                    activity.type === 'meeting' && 'bg-purple-100 text-purple-600',
                    activity.type === 'task' && 'bg-orange-100 text-orange-600',
                    activity.type === 'note' && 'bg-pink-100 text-pink-600',
                  )}>
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user?.firstName} {activity.user?.lastName} • {formatRelativeTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Link
            to="/crm/contacts"
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <Users className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium text-foreground">Contacts</span>
            <span className="text-xs text-muted-foreground">{safeContacts.length} total</span>
          </Link>
          <Link
            to="/crm/deals"
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <DollarSign className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium text-foreground">Deals</span>
            <span className="text-xs text-muted-foreground">{safeDeals.length} total</span>
          </Link>
          <Link
            to="/development/projects"
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <FolderGit2 className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium text-foreground">Projects</span>
            <span className="text-xs text-muted-foreground">{safeProjects.length} total</span>
          </Link>
          <Link
            to="/workflows"
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <Activity className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium text-foreground">Workflows</span>
            <span className="text-xs text-muted-foreground">Automate tasks</span>
          </Link>
        </div>
      </div>

      {/* Empty state prompt */}
      {safeContacts.length === 0 && safeDeals.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Get Started
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Your workspace is empty. Start by adding contacts, creating deals, or setting up projects.
          </p>
          <div className="flex gap-2 justify-center">
            <Link
              to="/crm/contacts"
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              Add First Contact
            </Link>
            <Link
              to="/development/projects"
              className="h-9 px-4 rounded-md border border-input bg-background text-foreground text-sm font-medium hover:bg-accent"
            >
              Create Project
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
