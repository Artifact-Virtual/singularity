import { useState, useCallback, useRef } from 'react';
import { cn } from '@shared/utils';
import {
  Zap,
  Clock,
  Twitter,
  MessageSquare,
  Linkedin,
  Instagram,
  Hash,
  BarChart2,
  DollarSign,
  TrendingUp,
  GitBranch,
  CheckCircle,
  XCircle,
  Settings,
  X,
} from 'lucide-react';

// Node types to icons mapping
const nodeIcons: Record<string, typeof Zap> = {
  trigger_webhook: Zap,
  trigger_schedule: Clock,
  trigger_integration: Zap,
  trigger_manual: Zap,
  action_twitter: Twitter,
  action_discord: MessageSquare,
  action_linkedin: Linkedin,
  action_instagram: Instagram,
  action_reddit: Hash,
  data_fred: BarChart2,
  data_binance: DollarSign,
  data_yfinance: TrendingUp,
  condition_if: GitBranch,
  endpoint_success: CheckCircle,
  endpoint_error: XCircle,
};

const nodeColors: Record<string, string> = {
  trigger_webhook: 'border-violet-500 bg-violet-500/10',
  trigger_schedule: 'border-violet-500 bg-violet-500/10',
  trigger_integration: 'border-violet-500 bg-violet-500/10',
  trigger_manual: 'border-violet-500 bg-violet-500/10',
  action_twitter: 'border-sky-500 bg-sky-500/10',
  action_discord: 'border-indigo-500 bg-indigo-500/10',
  action_linkedin: 'border-blue-600 bg-blue-600/10',
  action_instagram: 'border-pink-500 bg-pink-500/10',
  action_reddit: 'border-orange-500 bg-orange-500/10',
  data_fred: 'border-emerald-600 bg-emerald-600/10',
  data_binance: 'border-yellow-500 bg-yellow-500/10',
  data_yfinance: 'border-purple-600 bg-purple-600/10',
  condition_if: 'border-amber-500 bg-amber-500/10',
  endpoint_success: 'border-green-500 bg-green-500/10',
  endpoint_error: 'border-red-500 bg-red-500/10',
};

type WorkflowNode = {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
};

type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
};

type WorkflowCanvasProps = {
  zoom: number;
};

export function WorkflowCanvas({ zoom }: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: 'start',
      type: 'trigger_schedule',
      name: 'Daily at 9 AM',
      position: { x: 100, y: 100 },
      data: { cron: '0 9 * * *' },
    },
  ]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Handle drop from palette
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    
    const node = JSON.parse(data);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left - viewport.x) / (zoom / 100);
    const y = (e.clientY - rect.top - viewport.y) / (zoom / 100);
    
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: node.type,
      name: node.name,
      position: { x, y },
      data: {},
    };
    
    setNodes((prev) => [...prev, newNode]);
  }, [zoom, viewport]);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);
  
  // Node dragging
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    
    setDraggingNode(nodeId);
    setSelectedNode(nodeId);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left - viewport.x) / (zoom / 100) - node.position.x;
    const y = (e.clientY - rect.top - viewport.y) / (zoom / 100) - node.position.y;
    setDragOffset({ x, y });
  }, [nodes, zoom, viewport]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = (e.clientX - rect.left - viewport.x) / (zoom / 100) - dragOffset.x;
      const y = (e.clientY - rect.top - viewport.y) / (zoom / 100) - dragOffset.y;
      
      setNodes((prev) =>
        prev.map((node) =>
          node.id === draggingNode
            ? { ...node, position: { x, y } }
            : node
        )
      );
    } else if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setViewport((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [draggingNode, dragOffset, zoom, viewport, isPanning, panStart]);
  
  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
    setIsPanning(false);
  }, []);
  
  // Canvas panning
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      setSelectedNode(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, []);
  
  // Delete selected node
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
  }, [selectedNode]);
  
  return (
    <div
      ref={canvasRef}
      className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid background */}
      <div
        className="canvas-background absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--color-border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--color-border)) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * (zoom / 100)}px ${20 * (zoom / 100)}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
      />
      
      {/* Nodes container */}
      <div
        className="absolute"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${zoom / 100})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Render edges */}
        <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
          {edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;
            
            const sourceX = sourceNode.position.x + 120;
            const sourceY = sourceNode.position.y + 40;
            const targetX = targetNode.position.x;
            const targetY = targetNode.position.y + 40;
            
            const midX = (sourceX + targetX) / 2;
            
            return (
              <path
                key={edge.id}
                d={`M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`}
                stroke="hsl(var(--color-primary))"
                strokeWidth={2}
                fill="none"
              />
            );
          })}
        </svg>
        
        {/* Render nodes */}
        {nodes.map((node) => {
          const Icon = nodeIcons[node.type] || Zap;
          const colorClass = nodeColors[node.type] || 'border-muted-foreground bg-muted-foreground/10';
          const isSelected = selectedNode === node.id;
          
          return (
            <div
              key={node.id}
              className={cn(
                'absolute w-60 rounded-lg border-2 bg-card shadow-sm cursor-move select-none',
                colorClass,
                isSelected && 'ring-2 ring-primary ring-offset-2'
              )}
              style={{
                left: node.position.x,
                top: node.position.y,
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            >
              {/* Node header */}
              <div className="flex items-center gap-2 p-3 border-b border-border">
                <Icon className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium text-foreground flex-1 truncate">
                  {node.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Show settings
                  }}
                  className="p-1 rounded hover:bg-accent"
                >
                  <Settings className="h-3 w-3 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNode(node.id);
                  }}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              
              {/* Node body */}
              <div className="p-3">
                <p className="text-xs text-muted-foreground">
                  {node.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </p>
              </div>
              
              {/* Connection handles */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background cursor-crosshair" />
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background cursor-crosshair" />
            </div>
          );
        })}
      </div>
      
      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-muted-foreground">
              Drag nodes from the palette to get started
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
