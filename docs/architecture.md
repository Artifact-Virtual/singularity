# Architecture

Singularity is a modular async Python runtime with 13 subsystems. Each subsystem owns a domain, communicates through well-defined interfaces, and can be independently monitored, restarted, or upgraded.

---

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                    SINGULARITY                       │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  CORTEX  │  │  VOICE   │  │  MEMORY  │          │
│  │  (Brain) │──│  (LLM)   │  │  (COMB)  │          │
│  │  Agent   │  │  Chain   │  │  (VDB)   │          │
│  └────┬─────┘  └──────────┘  └──────────┘          │
│       │                                              │
│  ┌────┴─────┐  ┌──────────┐  ┌──────────┐          │
│  │  SINEW   │  │  CSUITE  │  │   POA    │          │
│  │  (Tools) │  │  (Execs) │  │ (Agents) │          │
│  │  28 ops  │  │  CTO/COO │  │  Health  │          │
│  └──────────┘  │  CFO/CISO│  │  Monitor │          │
│                └──────────┘  └──────────┘          │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  NEXUS   │  │  PULSE   │  │  IMMUNE  │          │
│  │  (Evolve)│  │  (Sched) │  │  (Heal)  │          │
│  │  HotSwap │  │  Cron    │  │  Watchdog│          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  NERVE   │  │  ATLAS   │  │ AUDITOR  │          │
│  │  (Comms) │  │  (Topo)  │  │  (Ops)   │          │
│  │  Discord │  │  Board   │  │  Release │          │
│  │  HTTP    │  │  Reports │  │  Audit   │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                      │
│  ┌──────────┐                                        │
│  │   CLI    │                                        │
│  │  Setup   │                                        │
│  └──────────┘                                        │
└─────────────────────────────────────────────────────┘
```

---

## Subsystem Responsibilities

### CORTEX — The Brain
The agent loop. Receives messages, plans actions, calls tools, manages conversation context. Implements BLINK for seamless continuation across budget boundaries.

**Key files:** `cortex/agent.py`, `cortex/engine.py`, `cortex/planner.py`, `cortex/context.py`

### SINEW — The Muscles
Tool definitions and execution. 28 native tools organized into domains: core (exec, read, write, edit), comms (Discord), memory (COMB, VDB), self-optimization (NEXUS), delegation (C-Suite), monitoring (POA), topology (ATLAS), and releases.

**Key files:** `sinew/definitions.py`, `sinew/executor.py`, `sinew/sandbox.py`

### VOICE — The Mouth
LLM provider chain with circuit-breaker fallback. Primary: Copilot Proxy (:3000). Fallback: HuggingFace Inference API. Emergency: Ollama (:11434). Automatic failover when a provider degrades.

**Key files:** `voice/chain.py`, `voice/provider.py`, `voice/proxy.py`, `voice/ollama.py`, `voice/huggingface.py`

### MEMORY — The Hippocampus
Persistence layer. COMB for lossless session-to-session staging. VDB for hybrid BM25 + TF-IDF search across all enterprise knowledge. Session files for conversation history.

**Key files:** `memory/comb.py`, `memory/vdb.py`, `memory/sessions.py`, `memory/context.py`

### C-SUITE — The Board
Executive delegation system. Four specialized agents (CTO, COO, CFO, CISO), each with scoped tool access. A Coordinator routes tasks, manages timeouts, and synthesizes results.

**Key files:** `csuite/coordinator.py`, `csuite/executive.py`, `csuite/dispatch.py`

### NEXUS — The Genome
Self-optimization engine. AST-based code analysis, pattern detection (silent exceptions, bare excepts, missing loggers), hot-swap at runtime with rollback, evolution engine for safe automated fixes.

**Key files:** `nexus/engine.py`, `nexus/analyzer.py`, `nexus/hotswap.py`, `nexus/journal.py`

### PULSE — The Heart
Scheduler. Cron expressions, interval timers, one-shots. Manages iteration budgets and POA audit cadence (every 4 hours per product).

**Key files:** `pulse/scheduler.py`, `pulse/timers.py`, `pulse/budget.py`

### POA — The Sentries
Product Owner Agents. Each shipped product gets a POA that monitors health (HTTP endpoints, SSL, ports), tracks uptime, and escalates degradation to Discord.

**Key files:** `poa/agent.py`, `poa/health.py`, `poa/manager.py`

### IMMUNE — The Antibodies
Self-healing watchdog. Monitors subsystem vitals, detects degradation patterns, triggers auto-recovery (restart services, clear caches, reset circuits).

**Key files:** `immune/watchdog.py`, `immune/vitals.py`, `immune/recovery.py`

### NERVE — The Nervous System
Communications adapter. Discord bot integration, HTTP API server (:8450), message routing, channel management.

**Key files:** `nerve/discord.py`, `nerve/http_api.py`, `nerve/router.py`

### ATLAS — The Map
Enterprise topology manager. Discovers modules across machines, tracks health status, generates board reports, manages module visibility.

**Key files:** `atlas/board.py`, `atlas/topology.py`, `atlas/actions.py`

### AUDITOR — Operations
Continuous operational auditing. Release management (scan, confirm, ship), changelog generation, compliance tracking.

**Key files:** `auditor/releases.py`, `auditor/changelog.py`, `auditor/compliance.py`

### CLI — The Console
Command-line tools for setup, diagnostics, and management. Bootstrap new installations, run health checks, manage configuration.

**Key files:** `cli/main.py`, `cli/setup.py`, `cli/diagnostics.py`

---

## Data Flow

```
User Message (Discord/HTTP)
    │
    ▼
  NERVE (adapter) ──── routes to ────► CORTEX (agent loop)
                                           │
                                    ┌──────┴──────┐
                                    ▼              ▼
                               VOICE (LLM)    SINEW (tools)
                               generate        execute
                                    │              │
                                    └──────┬───────┘
                                           ▼
                                    CORTEX (iterate)
                                           │
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                          C-SUITE       MEMORY        POA
                          delegate      persist      monitor
                              │            │            │
                              └────────────┼────────────┘
                                           ▼
                                    NERVE (respond)
                                           │
                                           ▼
                                    User Response
```

---

## Runtime Lifecycle

1. **Boot** — Load config, initialize subsystems, connect Discord
2. **Recall** — COMB recall, restore operational state
3. **Listen** — Accept messages via Discord and HTTP API
4. **Process** — CORTEX agent loop with VOICE + SINEW
5. **Monitor** — PULSE schedules POA audits, IMMUNE watches vitals
6. **Evolve** — NEXUS runs periodic self-optimization
7. **Persist** — COMB stages state, VDB indexes knowledge
8. **Shutdown** — Graceful teardown, final COMB stage

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Language | Python 3.11+ |
| Async | asyncio |
| Discord | discord.py |
| HTTP | aiohttp |
| LLM | OpenAI-compatible API (Copilot Proxy) |
| Search | BM25 + TF-IDF hybrid (native VDB) |
| Persistence | JSON (COMB), SQLite-style files (VDB) |
| AST | Python `ast` module (NEXUS) |
| Process | systemd user services |
| Proxy | Nginx reverse proxy |
| Tunnel | Cloudflare Argo Tunnel |

---

*Next: [Getting Started →](getting-started.md)*
