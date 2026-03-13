import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Play,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
} from 'lucide-react';
import { cn } from '@shared/utils';
import { NodePalette } from './NodePalette';
import { WorkflowCanvas } from './WorkflowCanvas';

type EditorTab = 'canvas' | 'settings' | 'executions';

export default function WorkflowEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  
  const [workflowName, setWorkflowName] = useState(isNew ? 'Untitled Workflow' : 'My Workflow');
  const [_activeTab, _setActiveTab] = useState<EditorTab>('canvas');
  const [isPalettOpen, setIsPaletteOpen] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [isDirty, setIsDirty] = useState(false);
  
  const handleSave = useCallback(() => {
    
    setIsDirty(false);
  }, []);
  
  const handleRun = useCallback(() => {
    
  }, []);
  
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-6">
      {/* Editor Header */}
      <div className="h-14 border-b border-border bg-background px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/workflows')}
            className="p-2 rounded-md hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => {
                setWorkflowName(e.target.value);
                setIsDirty(true);
              }}
              className="bg-transparent text-lg font-semibold text-foreground border-none focus:outline-none focus:ring-0 w-64"
            />
            {isDirty && (
              <span className="text-xs text-muted-foreground">• Unsaved</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center border-r border-border pr-2 mr-2">
            <button className="p-2 rounded-md hover:bg-accent disabled:opacity-50" disabled>
              <Undo className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-md hover:bg-accent disabled:opacity-50" disabled>
              <Redo className="h-4 w-4" />
            </button>
          </div>
          
          {/* Zoom controls */}
          <div className="flex items-center border-r border-border pr-2 mr-2">
            <button
              onClick={() => setZoom(Math.max(25, zoom - 25))}
              className="p-2 rounded-md hover:bg-accent"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 25))}
              className="p-2 rounded-md hover:bg-accent"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-md hover:bg-accent">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          
          {/* Actions */}
          <button
            onClick={handleSave}
            className="h-9 px-3 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
          <button
            onClick={handleRun}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Run
          </button>
        </div>
      </div>
      
      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette - Left Panel */}
        {isPalettOpen && (
          <div className="w-64 border-r border-border bg-background overflow-y-auto flex-shrink-0">
            <NodePalette />
          </div>
        )}
        
        {/* Canvas */}
        <div className="flex-1 relative bg-muted/30">
          <WorkflowCanvas zoom={zoom} />
          
          {/* Canvas overlay controls */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <button
              onClick={() => setIsPaletteOpen(!isPalettOpen)}
              className={cn(
                'h-9 px-3 rounded-md text-sm font-medium flex items-center gap-2',
                isPalettOpen
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border'
              )}
            >
              <Grid className="h-4 w-4" />
              Nodes
            </button>
          </div>
        </div>
        
        {/* Right Panel - Properties */}
        <div className="w-72 border-l border-border bg-background overflow-y-auto flex-shrink-0">
          <div className="p-4">
            <h3 className="font-semibold text-foreground mb-4">Properties</h3>
            
            <div className="text-sm text-muted-foreground text-center py-8">
              Select a node to view properties
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
