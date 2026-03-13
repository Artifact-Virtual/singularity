import { useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  // Triggers
  Webhook,
  Clock,
  Zap,
  MousePointer,
  // Social
  Twitter,
  MessageSquare,
  Linkedin,
  Instagram,
  Hash,
  // Data
  Database,
  TrendingUp,
  DollarSign,
  BarChart2,
  // Logic
  GitBranch,
  Repeat,
  Timer,
  // Data transform
  Shuffle,
  Filter,
  Variable,
  Globe,
  // Endpoints
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@shared/utils';

type NodeCategory = {
  id: string;
  name: string;
  icon: typeof Zap;
  nodes: NodeDefinition[];
};

type NodeDefinition = {
  type: string;
  name: string;
  description: string;
  icon: typeof Zap;
  color: string;
};

const nodeCategories: NodeCategory[] = [
  {
    id: 'triggers',
    name: 'Triggers',
    icon: Zap,
    nodes: [
      {
        type: 'trigger_webhook',
        name: 'Webhook',
        description: 'HTTP endpoint trigger',
        icon: Webhook,
        color: 'bg-violet-500',
      },
      {
        type: 'trigger_schedule',
        name: 'Schedule',
        description: 'Cron-based schedule',
        icon: Clock,
        color: 'bg-violet-500',
      },
      {
        type: 'trigger_integration',
        name: 'Integration Event',
        description: 'External platform event',
        icon: Zap,
        color: 'bg-violet-500',
      },
      {
        type: 'trigger_manual',
        name: 'Manual',
        description: 'User-triggered execution',
        icon: MousePointer,
        color: 'bg-violet-500',
      },
    ],
  },
  {
    id: 'social',
    name: 'Social Media',
    icon: Twitter,
    nodes: [
      {
        type: 'action_twitter',
        name: 'Twitter / X',
        description: 'Post, reply, DM, like',
        icon: Twitter,
        color: 'bg-sky-500',
      },
      {
        type: 'action_discord',
        name: 'Discord',
        description: 'Messages, servers, roles',
        icon: MessageSquare,
        color: 'bg-indigo-500',
      },
      {
        type: 'action_linkedin',
        name: 'LinkedIn',
        description: 'Posts, company updates',
        icon: Linkedin,
        color: 'bg-blue-600',
      },
      {
        type: 'action_instagram',
        name: 'Instagram',
        description: 'Post media, stories',
        icon: Instagram,
        color: 'bg-pink-500',
      },
      {
        type: 'action_reddit',
        name: 'Reddit',
        description: 'Post, comment, monitor',
        icon: Hash,
        color: 'bg-orange-500',
      },
    ],
  },
  {
    id: 'data',
    name: 'Data Providers',
    icon: Database,
    nodes: [
      {
        type: 'data_fred',
        name: 'FRED',
        description: 'Economic data',
        icon: BarChart2,
        color: 'bg-emerald-600',
      },
      {
        type: 'data_binance',
        name: 'Binance',
        description: 'Crypto data & trading',
        icon: DollarSign,
        color: 'bg-yellow-500',
      },
      {
        type: 'data_yfinance',
        name: 'Yahoo Finance',
        description: 'Stock & market data',
        icon: TrendingUp,
        color: 'bg-purple-600',
      },
      {
        type: 'action_http',
        name: 'HTTP Request',
        description: 'Custom API calls',
        icon: Globe,
        color: 'bg-slate-600',
      },
    ],
  },
  {
    id: 'logic',
    name: 'Logic',
    icon: GitBranch,
    nodes: [
      {
        type: 'condition_if',
        name: 'If / Else',
        description: 'Conditional branching',
        icon: GitBranch,
        color: 'bg-amber-500',
      },
      {
        type: 'loop_foreach',
        name: 'For Each',
        description: 'Iterate over items',
        icon: Repeat,
        color: 'bg-amber-500',
      },
      {
        type: 'delay',
        name: 'Delay',
        description: 'Wait before continuing',
        icon: Timer,
        color: 'bg-amber-500',
      },
    ],
  },
  {
    id: 'transform',
    name: 'Data Transform',
    icon: Shuffle,
    nodes: [
      {
        type: 'transform_map',
        name: 'Transform',
        description: 'Map & transform data',
        icon: Shuffle,
        color: 'bg-cyan-500',
      },
      {
        type: 'transform_filter',
        name: 'Filter',
        description: 'Filter items',
        icon: Filter,
        color: 'bg-cyan-500',
      },
      {
        type: 'data_variable',
        name: 'Set Variable',
        description: 'Store value',
        icon: Variable,
        color: 'bg-cyan-500',
      },
    ],
  },
  {
    id: 'endpoints',
    name: 'Endpoints',
    icon: CheckCircle,
    nodes: [
      {
        type: 'endpoint_success',
        name: 'Success',
        description: 'Workflow completed',
        icon: CheckCircle,
        color: 'bg-green-500',
      },
      {
        type: 'endpoint_error',
        name: 'Error',
        description: 'Workflow failed',
        icon: XCircle,
        color: 'bg-red-500',
      },
    ],
  },
];

type NodeItemProps = {
  node: NodeDefinition;
  onDragStart: (e: React.DragEvent, node: NodeDefinition) => void;
};

function NodeItem({ node, onDragStart }: NodeItemProps) {
  const Icon = node.icon;
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, node)}
      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-grab active:cursor-grabbing"
    >
      <div className={cn('p-1.5 rounded', node.color)}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{node.name}</p>
        <p className="text-xs text-muted-foreground truncate">{node.description}</p>
      </div>
    </div>
  );
}

export function NodePalette() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    nodeCategories.map((c) => c.id)
  );
  
  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };
  
  const handleDragStart = (e: React.DragEvent, node: NodeDefinition) => {
    e.dataTransfer.setData('application/json', JSON.stringify(node));
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  // Filter nodes by search
  const filteredCategories = nodeCategories
    .map((category) => ({
      ...category,
      nodes: category.nodes.filter(
        (node) =>
          node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.nodes.length > 0);
  
  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      
      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCategories.map((category) => {
          const isExpanded = expandedCategories.includes(category.id);
          const CategoryIcon = category.icon;
          
          return (
            <div key={category.id} className="mb-2">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {category.name}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {category.nodes.length}
                </span>
              </button>
              
              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {category.nodes.map((node) => (
                    <NodeItem
                      key={node.type}
                      node={node}
                      onDragStart={handleDragStart}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
