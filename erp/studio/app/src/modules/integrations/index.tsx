import { Routes, Route, Link } from 'react-router-dom';
import {
  Plug,
  Twitter,
  MessageSquare,
  Linkedin,
  Instagram,
  Hash,
  TrendingUp,
  DollarSign,
  BarChart2,
  Plus,
  CheckCircle,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { cn } from '@shared/utils';

// Integration types
type Integration = {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: typeof Plug;
  category: 'social' | 'data' | 'communication' | 'devops';
  status: 'connected' | 'disconnected' | 'error';
  color: string;
};

// Available integrations
const availableIntegrations: Integration[] = [
  // Social Media
  {
    id: 'twitter',
    type: 'twitter',
    name: 'Twitter / X',
    description: 'Post tweets, read mentions, send DMs',
    icon: Twitter,
    category: 'social',
    status: 'disconnected',
    color: 'bg-sky-500',
  },
  {
    id: 'discord',
    type: 'discord',
    name: 'Discord',
    description: 'Manage servers, send messages, create bots',
    icon: MessageSquare,
    category: 'social',
    status: 'disconnected',
    color: 'bg-indigo-500',
  },
  {
    id: 'linkedin',
    type: 'linkedin',
    name: 'LinkedIn',
    description: 'Post updates, manage company pages',
    icon: Linkedin,
    category: 'social',
    status: 'disconnected',
    color: 'bg-blue-600',
  },
  {
    id: 'instagram',
    type: 'instagram',
    name: 'Instagram',
    description: 'Post media, stories, manage comments',
    icon: Instagram,
    category: 'social',
    status: 'disconnected',
    color: 'bg-pink-500',
  },
  {
    id: 'reddit',
    type: 'reddit',
    name: 'Reddit',
    description: 'Post to subreddits, monitor discussions',
    icon: Hash,
    category: 'social',
    status: 'disconnected',
    color: 'bg-orange-500',
  },
  // Data Providers
  {
    id: 'fred',
    type: 'fred',
    name: 'FRED',
    description: 'Federal Reserve economic data',
    icon: BarChart2,
    category: 'data',
    status: 'disconnected',
    color: 'bg-emerald-600',
  },
  {
    id: 'binance',
    type: 'binance',
    name: 'Binance',
    description: 'Crypto prices, trading, account data',
    icon: DollarSign,
    category: 'data',
    status: 'disconnected',
    color: 'bg-yellow-500',
  },
  {
    id: 'yfinance',
    type: 'yfinance',
    name: 'Yahoo Finance',
    description: 'Stocks, forex, options, financials',
    icon: TrendingUp,
    category: 'data',
    status: 'disconnected',
    color: 'bg-purple-600',
  },
];

// Integration Card Component
function IntegrationCard({ integration }: { integration: Integration }) {
  const Icon = integration.icon;
  
  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={cn('p-3 rounded-lg', integration.color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex items-center gap-2">
          {integration.status === 'connected' ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" />
              Connected
            </span>
          ) : integration.status === 'error' ? (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              Error
            </span>
          ) : null}
        </div>
      </div>
      
      <div className="mt-4">
        <h3 className="font-semibold text-foreground">{integration.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {integration.description}
        </p>
      </div>
      
      <div className="mt-4 flex gap-2">
        {integration.status === 'connected' ? (
          <>
            <button className="flex-1 h-9 px-3 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80">
              <Settings className="h-4 w-4 inline mr-2" />
              Configure
            </button>
          </>
        ) : (
          <button className="flex-1 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Plus className="h-4 w-4 inline mr-2" />
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

// Main Integrations Page
function IntegrationsPage() {
  const socialIntegrations = availableIntegrations.filter(i => i.category === 'social');
  const dataIntegrations = availableIntegrations.filter(i => i.category === 'data');
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground">
            Connect external platforms and data providers for workflows
          </p>
        </div>
      </div>
      
      {/* Social Media */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Social Media Platforms
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {socialIntegrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      </div>
      
      {/* Data Providers */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Data Providers
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dataIntegrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Connected Integrations Page
function ConnectedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Connected Integrations</h1>
        <p className="text-muted-foreground">
          Manage your active integration connections
        </p>
      </div>
      
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Plug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          No integrations connected yet.
        </p>
        <Link
          to="/integrations"
          className="inline-flex items-center gap-2 mt-4 text-primary hover:underline"
        >
          <Plus className="h-4 w-4" />
          Browse available integrations
        </Link>
      </div>
    </div>
  );
}

// Main Integrations Module Router
export default function Integrations() {
  return (
    <Routes>
      <Route index element={<IntegrationsPage />} />
      <Route path="connected" element={<ConnectedPage />} />
    </Routes>
  );
}
