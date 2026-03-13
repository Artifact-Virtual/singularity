# Workflow System Architecture

**Module:** Workflows  
**Version:** 1.0.0  
**Date:** 2026-02-02

---

## Overview

The Workflow system provides a visual drag-and-drop canvas for building automated workflows. Users can connect triggers (entry points), actions, conditions, and transformations to create powerful automations.

---

## Core Concepts

### 1. Workflow

A workflow is a directed graph of nodes connected by edges.

```typescript
type Workflow = {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'error';
  
  // Canvas data
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: { x: number; y: number; zoom: number };
  
  // Execution settings
  schedule?: CronSchedule;
  retryPolicy: RetryPolicy;
  timeout: number; // milliseconds
  
  // Metadata
  version: number;
  lastRun?: Date;
  runCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 2. Nodes

```typescript
type WorkflowNode = {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
  config: NodeConfig;
};

type NodeType =
  // Entry Points (Triggers)
  | 'trigger_webhook'
  | 'trigger_schedule'
  | 'trigger_integration'
  | 'trigger_manual'
  
  // Actions
  | 'action_integration'
  | 'action_http'
  | 'action_email'
  | 'action_notification'
  
  // Logic
  | 'condition_if'
  | 'condition_switch'
  | 'loop_foreach'
  | 'loop_while'
  
  // Data
  | 'transform_map'
  | 'transform_filter'
  | 'transform_aggregate'
  | 'data_variable'
  | 'data_merge'
  
  // Control
  | 'delay'
  | 'parallel'
  | 'subworkflow'
  
  // Endpoints
  | 'endpoint_success'
  | 'endpoint_error';
```

### 3. Edges

```typescript
type WorkflowEdge = {
  id: string;
  source: string;      // Source node ID
  target: string;      // Target node ID
  sourceHandle?: string; // For nodes with multiple outputs
  targetHandle?: string; // For nodes with multiple inputs
  label?: string;
  condition?: string;  // For conditional edges
};
```

---

## Node Categories

### Entry Points (Triggers)

| Node | Description | Configuration |
|------|-------------|---------------|
| **Webhook Trigger** | HTTP endpoint that starts workflow | URL, method, auth |
| **Schedule Trigger** | Cron-based scheduling | Cron expression, timezone |
| **Integration Trigger** | Platform event (e.g., new tweet) | Integration, event type |
| **Manual Trigger** | User-initiated execution | Input schema |

### Integration Actions

| Node | Platforms | Actions |
|------|-----------|---------|
| **Social Post** | Twitter, LinkedIn, Instagram, Reddit | Create post |
| **Social Message** | Twitter DM, Discord, LinkedIn | Send message |
| **Discord Action** | Discord | Manage server, channels, roles |
| **Data Fetch** | FRED, Binance, Yahoo Finance | Get market data |
| **Trading** | Binance | Place orders |

### Logic Nodes

| Node | Description | Configuration |
|------|-------------|---------------|
| **If Condition** | Branch based on condition | Expression |
| **Switch** | Multiple branches | Cases, default |
| **For Each** | Iterate over array | Array path, variable |
| **While Loop** | Loop with condition | Condition, max iterations |

### Data Transformation

| Node | Description | Configuration |
|------|-------------|---------------|
| **Map** | Transform each item | Mapping function |
| **Filter** | Filter items by condition | Filter expression |
| **Aggregate** | Reduce to single value | Aggregation type |
| **Set Variable** | Store value | Variable name, value |
| **Merge** | Combine data from parallel | Merge strategy |

### Control Flow

| Node | Description | Configuration |
|------|-------------|---------------|
| **Delay** | Wait before continuing | Duration |
| **Parallel** | Execute branches in parallel | - |
| **Sub-workflow** | Call another workflow | Workflow ID, inputs |

### Endpoints

| Node | Description | Configuration |
|------|-------------|---------------|
| **Success** | Workflow completed successfully | Output data |
| **Error** | Workflow failed | Error handling |

---

## Visual Editor Specification

### Canvas Features

- **Zoom & Pan**: Mouse wheel zoom, drag to pan
- **Grid Snap**: Nodes snap to grid
- **Minimap**: Overview of entire workflow
- **Auto-layout**: Automatic node arrangement
- **Undo/Redo**: Full history support
- **Copy/Paste**: Duplicate nodes
- **Multi-select**: Select multiple nodes
- **Grouping**: Group nodes visually

### Node UI

```
┌─────────────────────────────────────┐
│ 🔔 Twitter Trigger            ⚙️ ✕ │
├─────────────────────────────────────┤
│                                     │
│  Event: New Mention                 │
│  Account: @artifactvirtual          │
│                                     │
├─────────────────────────────────────┤
│ ○ Output                            │
└─────────────────────────────────────┘
```

### Connection Rules

- Triggers can only be entry points (no incoming edges)
- Endpoints can only be exit points (no outgoing edges)
- Actions can have multiple inputs and outputs
- Loops create special back-edges

### Node Palette

```
┌─────────────────────────────────────┐
│ 🔍 Search nodes...                  │
├─────────────────────────────────────┤
│ ▼ Triggers                          │
│   📥 Webhook                        │
│   ⏰ Schedule                        │
│   🔌 Integration Event              │
│   👆 Manual                         │
├─────────────────────────────────────┤
│ ▼ Integrations                      │
│   🐦 Twitter                        │
│   💬 Discord                        │
│   💼 LinkedIn                       │
│   📸 Instagram                      │
│   🔴 Reddit                         │
│   📊 FRED                           │
│   💰 Binance                        │
│   📈 Yahoo Finance                  │
├─────────────────────────────────────┤
│ ▼ Logic                             │
│   ❓ If/Else                        │
│   🔀 Switch                         │
│   🔁 For Each                       │
│   ⏳ Delay                          │
├─────────────────────────────────────┤
│ ▼ Data                              │
│   🔄 Transform                      │
│   📝 Variable                       │
│   🔗 HTTP Request                   │
├─────────────────────────────────────┤
│ ▼ Endpoints                         │
│   ✅ Success                        │
│   ❌ Error                          │
└─────────────────────────────────────┘
```

---

## Workflow Execution

### Execution Model

```typescript
type WorkflowExecution = {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  trigger: {
    type: string;
    data: unknown;
  };
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  nodeExecutions: NodeExecution[];
  output?: unknown;
  error?: {
    nodeId: string;
    message: string;
    stack?: string;
  };
};

type NodeExecution = {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  input?: unknown;
  output?: unknown;
  error?: string;
};
```

### Execution Flow

```
1. Trigger fires (webhook, schedule, event)
2. Create execution record
3. Execute nodes in topological order
4. For each node:
   a. Gather inputs from connected nodes
   b. Execute node logic
   c. Store output
   d. Trigger downstream nodes
5. Handle errors with retry policy
6. Mark execution complete
```

### Scheduling

```typescript
type CronSchedule = {
  expression: string;   // "0 9 * * MON-FRI"
  timezone: string;     // "America/New_York"
  enabled: boolean;
};
```

---

## API Endpoints

### Workflow Management

```
GET    /api/workflows                       # List workflows
GET    /api/workflows/:id                   # Get workflow
POST   /api/workflows                       # Create workflow
PUT    /api/workflows/:id                   # Update workflow
DELETE /api/workflows/:id                   # Delete workflow
POST   /api/workflows/:id/duplicate         # Duplicate workflow
```

### Workflow Lifecycle

```
POST   /api/workflows/:id/activate          # Activate workflow
POST   /api/workflows/:id/pause             # Pause workflow
POST   /api/workflows/:id/trigger           # Manual trigger
GET    /api/workflows/:id/validate          # Validate workflow
```

### Executions

```
GET    /api/workflows/:id/executions        # List executions
GET    /api/executions/:id                  # Get execution details
POST   /api/executions/:id/cancel           # Cancel execution
POST   /api/executions/:id/retry            # Retry execution
```

### Versioning

```
GET    /api/workflows/:id/versions          # List versions
GET    /api/workflows/:id/versions/:version # Get specific version
POST   /api/workflows/:id/rollback/:version # Rollback to version
```

---

## Example Workflows

### 1. Social Media Cross-Post

```
[Schedule: Daily 9AM]
    ↓
[Fetch: FRED Economic Data]
    ↓
[Transform: Format Message]
    ↓
[Parallel]
    ├→ [Post: Twitter]
    ├→ [Post: LinkedIn]
    └→ [Post: Discord]
    ↓
[Success]
```

### 2. Crypto Price Alert

```
[Trigger: Binance Price Stream]
    ↓
[Condition: Price > $50000]
    ├─ Yes → [Send: Discord Alert]
    │           ↓
    │        [Send: Email Alert]
    │           ↓
    │        [Success]
    └─ No  → [Success]
```

### 3. Discord Server Management

```
[Trigger: Discord New Member]
    ↓
[Action: Assign Welcome Role]
    ↓
[Action: Send Welcome DM]
    ↓
[Delay: 5 minutes]
    ↓
[Action: Post in #introductions]
    ↓
[Success]
```

---

## Technology Stack

### Canvas Library

**React Flow** - Industry-standard node-based UI
- Highly customizable
- Built-in zoom/pan
- Edge routing
- Minimap support
- TypeScript support

### Execution Engine

**BullMQ** - Redis-based job queue
- Reliable execution
- Retry support
- Delayed jobs
- Rate limiting
- Priority queues

### Scheduling

**node-cron** or **Agenda** - Job scheduling
- Cron expressions
- Timezone support
- Persistence

---

**Document Owner:** Platform Team
