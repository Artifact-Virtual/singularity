<p align="center">
  <img src="https://img.shields.io/badge/SINGULARITY-AE-blueviolet?style=for-the-badge&labelColor=0d1117" alt="Singularity AE" />
</p>

<h1 align="center">SINGULARITY [AE]</h1>

<p align="center">
  <strong>Obelisk</strong><br/>
  <em>Not a chatbot. An operating system for organizations.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.0-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/python-3.11+-3776ab?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/subsystems-12-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/license-PROPRIETARY-red?style=flat-square" />
</p>

<p align="center">
  <a href="#what-is-singularity">What</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#subsystems">Subsystems</a> •
  <a href="#tools">Tools</a> •
  <a href="#infrastructure">Infrastructure</a> •
  <a href="#philosophy">Philosophy</a>
</p>

---

## What Is Singularity?

Singularity is a **self-scaling autonomous enterprise runtime**. It deploys AI executive agents, monitors live products, heals degraded systems, maps enterprise topology, and evolves its own codebase — from a solo founder to a multinational.

It does five things:

1. **Audits** your workspace — discovers projects, services, infrastructure, and gaps
2. **Proposes** executive agents tailored to what it found — CTO, CFO, CISO, or domain-specific
3. **Deploys** Product Owner Agents (POAs) that monitor your live products 24/7
4. **Maps** your entire enterprise topology (ATLAS) — every service, port, agent, and dependency
5. **Evolves** its own code (NEXUS) — finds anti-patterns, applies fixes, rolls back if wrong

Everything is **approval-gated**. Singularity proposes. You decide.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   You: singularity init --workspace ./my-company             │
│                                                              │
│   Singularity:                                               │
│   ✓ Scanned 14 projects (87,432 LOC)                        │
│   ✓ Found 3 live services, 2 CI/CD pipelines                │
│   ✓ Detected industry: fintech                              │
│                                                              │
│   Proposed executives:                                       │
│   🔴 CTO — 14 projects, infrastructure detected             │
│   🔴 CISO — credentials and API keys found                  │
│   🟡 CRO — fintech requires risk management                 │
│                                                              │
│   Proposed POAs:                                             │
│   📋 payment-api — live service, 3 endpoints                │
│   📋 auth-service — live service, SSL monitored              │
│                                                              │
│   Approve? [y/n]                                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

> **What it is not:** a wrapper around ChatGPT. Singularity is a native runtime with its own event bus, memory system, health monitoring, tool execution sandbox, provider failover chain, scheduling engine, enterprise topology graph, and self-optimization engine. Every component is built from first principles. Zero vendor lock-in.

---

## Architecture

```
                          ┌────────────────────────────────────────────────────┐
                          │              SINGULARITY RUNTIME                   │
                          │                                                    │
  CLI / Discord ──────▶  │  NERVE ──▶ CORTEX ──▶ SINEW ──▶ VOICE             │
  Cron / PULSE ──────▶   │                │                                   │
  Inbox files ──────▶    │           EVENT BUS (async pub/sub)                │
                          │                │                                   │
                          │   IMMUNE · PULSE · MARROW · SPINE · HEKTOR        │
                          │                │                                   │
                          │    C-SUITE  ·  POA  ·  ATLAS  ·  NEXUS           │
                          │                │                                   │
                          │   ExfilGuard/Sentinel · BLINK · Release Manager   │
                          └────────────────────────────────────────────────────┘
```

**12 subsystems.** Event-bus architecture. Everything communicates through async pub/sub. Any component can fail independently. The system heals faster than it degrades.

### Repository Layout

```
singularity/
├── singularity/                    # Runtime package
│   ├── bus.py                      # Event bus — the nervous system
│   ├── config.py                   # SPINE — hot-reload configuration
│   ├── runtime.py                  # Boot sequence + main loop
│   │
│   ├── cortex/                     # 🧠 CORTEX — Brain
│   │   ├── agent.py                #    Think → Act → Observe loop
│   │   ├── blink.py                #    BLINK — seamless session continuation
│   │   ├── context.py              #    Context assembly + compaction
│   │   └── engine.py               #    Cortex orchestrator
│   │
│   ├── nerve/                      # 🔌 NERVE — Communications
│   │   ├── adapter.py              #    Abstract channel adapter
│   │   ├── deployer.py             #    Discord bot deployment manager
│   │   ├── discord.py              #    Discord adapter (gateway v10)
│   │   ├── formatter.py            #    Platform-aware message formatting
│   │   ├── http_api.py             #    REST API adapter
│   │   ├── presence.py             #    Online/status management
│   │   ├── router.py               #    Inbound routing + policy
│   │   └── types.py                #    Message types + channel state machine
│   │
│   ├── memory/                     # 🦴 MARROW — Memory
│   │   ├── comb.py                 #    COMB bridge (stage/recall/rollup)
│   │   ├── hektor.py               #    HEKTOR BM25 workspace search
│   │   └── sessions.py             #    Session management + SQLite
│   │
│   ├── voice/                      # 🗣️ VOICE — LLM Providers
│   │   ├── provider.py             #    Abstract provider + circuit breaker
│   │   ├── chain.py                #    Provider cascade with auto-fallback
│   │   ├── proxy.py                #    GitHub Copilot proxy provider
│   │   └── ollama.py               #    Local Ollama provider (sovereign)
│   │
│   ├── sinew/                      # 💪 SINEW — Tool Execution
│   │   ├── executor.py             #    Sandboxed tool runner
│   │   ├── definitions.py          #    Tool registry + schemas
│   │   ├── sandbox.py              #    Execution sandbox + safety
│   │   ├── sandbox_exec.py         #    ExfilGuard execution sandbox
│   │   └── changeset.py            #    File changeset tracking
│   │
│   ├── immune/                     # 🛡️ IMMUNE — Health & Recovery
│   │   ├── watchdog.py             #    Process watchdog + auto-restart
│   │   ├── health.py               #    Health check orchestrator
│   │   ├── vitals.py               #    System vitals (disk, memory, load)
│   │   ├── auditor.py              #    Audit loop + alerting
│   │   ├── reflector.py            #    ATLAS feedback loop
│   │   └── feedback.py             #    Structured health feedback
│   │
│   ├── pulse/                      # 💓 PULSE — Scheduler
│   │   ├── scheduler.py            #    Cron + triggers + timers
│   │   ├── budget.py               #    Iteration budget management
│   │   └── health.py               #    PULSE health monitor
│   │
│   ├── csuite/                     # 👔 C-SUITE — Executive Agents
│   │   ├── roles.py                #    Role registry + industry templates
│   │   ├── coordinator.py          #    Multi-exec dispatch + orchestration
│   │   ├── executive.py            #    Executive agent loop + lifecycle
│   │   ├── dispatch.py             #    High-level dispatch API
│   │   ├── reports.py              #    Structured exec reporting
│   │   ├── self_heal.py            #    Autonomous failure recovery engine
│   │   └── webhooks.py             #    Discord webhook reporter
│   │
│   ├── poa/                        # 📋 POA — Product Owner Agents
│   │   ├── manager.py              #    POA lifecycle management
│   │   ├── runtime.py              #    Audit execution + monitoring
│   │   ├── release.py              #    Autonomous GitHub release pipeline
│   │   └── setup.py                #    POA provisioning
│   │
│   ├── atlas/                      # 🗺️ ATLAS — Enterprise Topology
│   │   ├── manager.py              #    ATLAS orchestrator (run_cycle)
│   │   ├── discovery.py            #    Multi-source module discovery
│   │   ├── topology.py             #    Graph data models + status FSM
│   │   ├── coach.py                #    6-dimension fitness evaluator
│   │   ├── actions.py              #    Auto-fix action executor
│   │   └── board.py                #    Board report generator
│   │
│   ├── nexus/                      # 🔁 NEXUS — Self-Optimization
│   │   ├── engine.py               #    NexusEngine (audit/propose/optimize)
│   │   ├── analyzer.py             #    AST-based code analysis
│   │   ├── proposals.py            #    Proposal generator + confidence scoring
│   │   ├── hotswap.py              #    Hot-swap + rollback journal
│   │   ├── applicator.py           #    Proposal application engine
│   │   ├── evolve.py               #    Evolution engine (pattern transforms)
│   │   └── daemon.py               #    NEXUS background daemon
│   │
│   └── auditor/                    # 🔍 AUDITOR — Workspace Intelligence
│       ├── scanner.py              #    Filesystem + git analysis
│       ├── analyzer.py             #    Maturity scoring + gap detection
│       ├── report.py               #    JSON + Markdown report generation
│       └── templates.py            #    Industry-specific templates
│
├── config/
│   ├── singularity.yaml            # Active config (gitignored)
│   └── singularity.example.yaml   # Reference config (committed)
│
├── docs/                           # Detailed system documentation
│   ├── architecture.md             # System diagram, boot phases, data flows
│   ├── atlas.md                    # ATLAS board manager
│   ├── nexus.md                    # Self-optimization engine
│   ├── csuite.md                   # Executive delegation system
│   ├── poa.md                      # Product Owner Agents
│   └── sentinel.md                 # ExfilGuard + security layer
│
├── scripts/
│   ├── deploy_guild.py             # Discord guild deployment
│   ├── dispatch.py                 # CLI dispatch tool
│   ├── fresh_install.py            # First-time setup
│   ├── redeploy_guild.py           # Re-deploy existing guild
│   └── stress_test.py              # Load testing
│
├── tests/
│   └── test_e2e.py                 # 30 end-to-end tests (all subsystems)
│
├── tools/
│   └── copilot_proxy.py            # GitHub Copilot proxy helper
│
├── .core/                          # Runtime operational data (gitignored)
│   ├── AGENTS.md                   # Operating protocol
│   ├── IDENTITY.md                 # Runtime identity
│   ├── SOUL.md                     # Core character + mission
│   └── profiles/                   # Agent identity profiles
│
└── .singularity/                   # Runtime state (gitignored)
    ├── audits/                     # POA audit reports
    ├── csuite/                     # C-Suite dispatches, results, inbox
    ├── deployments/                # Discord deployment state
    ├── nexus/                      # NEXUS optimization results
    └── poas/                       # POA configs + logs
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Git
- (Optional) Discord bot token for communication channel
- (Optional) Anthropic/OpenAI API key or local Ollama

### Install

```bash
# Clone
git clone https://github.com/Artifact-Virtual/singularity.git
cd singularity

# Create virtualenv
python3 -m venv .venv
source .venv/bin/activate

# Install
pip install -e .
```

### Configure

```bash
# Copy example configs
cp .env.example .env
cp config/singularity.example.yaml config/singularity.yaml

# Edit .env — set your API keys and Discord token
# Edit config/singularity.yaml — set your workspace + preferences
```

Required `.env` values:

```env
ANTHROPIC_API_KEY=sk-ant-...            # Primary LLM provider
SINGULARITY_DISCORD_TOKEN=...           # Discord bot token (optional)
```

### Initialize

```bash
# Interactive wizard — scans workspace, proposes executives
python3 -m singularity.cli.main init

# Non-interactive with explicit options
python3 -m singularity.cli.main init \
  --workspace /path/to/your/code \
  --industry fintech \
  --non-interactive
```

The init wizard:
1. Scans your workspace in under a second
2. Identifies projects, services, and infrastructure
3. Proposes executive agents based on what it finds
4. Deploys POAs for live products (with your approval)
5. Starts monitoring

### Run

```bash
# Start the runtime
python3 -m singularity

# Or via entry point
singularity
```

---

## Subsystems

| # | Subsystem | Code | What It Does |
|---|-----------|------|-------------|
| 1 | **CORTEX** | `singularity/cortex/` | Agent loop: Think → Act → Observe. Parallel tool execution. |
| 2 | **NERVE** | `singularity/nerve/` | Channel adapters (Discord, HTTP). Platform-aware formatting. Policy enforcement. |
| 3 | **MARROW** | `singularity/memory/` | COMB persistence. Session management. HEKTOR workspace search. |
| 4 | **IMMUNE** | `singularity/immune/` | Watchdog with auto-restart. Health checks. Vitals monitoring. Failover alerting. |
| 5 | **SINEW** | `singularity/sinew/` | Sandboxed tool executor. Schema validation. Timeout enforcement. ExfilGuard integration. |
| 6 | **VOICE** | `singularity/voice/` | LLM provider chain with circuit breakers. Auto-fallback. Streaming. Token counting. |
| 7 | **SPINE** | `singularity/config.py` | Hot-reload YAML/JSON config. Environment variable overrides. Runtime reconfiguration. |
| 8 | **PULSE** | `singularity/pulse/` | Cron scheduler. Iteration budgets. Health monitoring. Auto-expansion for complex tasks. |
| 9 | **C-SUITE** | `singularity/csuite/` | Executive agents with scoped access. Industry-specific roles. Self-heal engine. |
| 10 | **POA** | `singularity/poa/` | Product Owner Agents. Endpoint monitoring. SSL tracking. Autonomous release pipeline. |
| 11 | **ATLAS** | `singularity/atlas/` | Enterprise topology auto-discovery. Coach evaluation. Board reports. Visibility index. |
| 12 | **NEXUS** | `singularity/nexus/` | AST analysis. Proposal generation. Hot-swap with rollback journal. Evolution engine. |

### Supporting Systems

| System | Where | Purpose |
|--------|-------|---------|
| **BLINK** | `singularity/cortex/blink.py` | Seamless session continuation across budget boundaries |
| **HEKTOR** | `singularity/memory/hektor.py` | In-process BM25 workspace search — no daemon, no socket |
| **COMB** | `singularity/memory/comb.py` | Cross-session lossless memory bridge (PyPI: `comb-db`) |
| **ExfilGuard** | `singularity/sinew/sandbox_exec.py` | Credential exfiltration prevention + sandbox enforcement |
| **Sentinel** | CISO + ExfilGuard integration | Security monitoring + auto-dispatch on threat detection |
| **Release Manager** | `singularity/poa/release.py` | Autonomous GitHub release pipeline (conventional commits → semver) |

### The Event Bus

Every subsystem communicates through a central async event bus. No direct inter-subsystem imports at runtime. Loose coupling, tight coordination.

```
A single health check failure cascades through the entire system:

IMMUNE.vitals.collect() → disk > 90%
  → bus.emit("health.degraded")
    → Watchdog schedules cleanup task
      → SINEW executes cleanup command
        → NERVE sends Discord alert
          → CORTEX logs incident to MARROW
            → ATLAS flags module in topology
```

#### Event Namespaces

| Namespace | Source | Key Events |
|-----------|--------|-----------|
| `atlas.*` | ATLAS | `atlas.cycle.complete`, `atlas.alert`, `atlas.module.discovered` |
| `csuite.*` | C-Suite | `csuite.dispatch.started`, `csuite.task.completed`, `csuite.escalation` |
| `nexus.*` | NEXUS | `nexus.cycle.started`, `nexus.cycle.completed`, `nexus.rollback.all` |
| `health.*` | IMMUNE | `health.degraded`, `health.recovered` |
| `poa.*` | POA | `poa.audit.complete`, `poa.alert` |
| `config.*` | SPINE | `config.loaded`, `config.changed` |
| `cortex.*` | CORTEX | `cortex.blink`, `cortex.blink.resumed` |

---

## Tools

Every tool available to executive agents, with role permissions:

| Tool | Description | CTO | COO | CFO | CISO |
|------|-------------|-----|-----|-----|------|
| `read` | Read file contents | ✅ | ✅ | ✅ | ✅ |
| `write` | Write/create files | ✅ | ✅ | ❌ | ❌ |
| `edit` | Targeted find/replace in files | ✅ | ✅ | ❌ | ❌ |
| `exec` | Shell command execution | ✅ | ✅ | ❌ | ✅ |
| `web_fetch` | HTTP GET requests | ✅ | ❌ | ✅ | ✅ |
| `memory_search` | HEKTOR hybrid workspace search | ✅ | ✅ | ✅ | ✅ |
| `comb_recall` | Load cross-session memory | ✅ | ✅ | ✅ | ✅ |
| `comb_stage` | Persist memory across sessions | ✅ | ✅ | ✅ | ✅ |
| `csuite_dispatch` | Dispatch task to executive | ✅* | — | — | — |
| `poa_manage` | Manage POA lifecycle | ✅ | ✅ | — | — |
| `nexus_audit` | Scan codebase for anti-patterns | ✅ | — | — | — |
| `nexus_evolve` | Apply safe code improvements | ✅ | — | — | — |
| `nexus_swap` | Hot-swap a live function | ✅ | — | — | — |
| `nexus_rollback` | Rollback a hot-swap | ✅ | — | — | — |
| `atlas_report` | Get enterprise board report | ✅ | ✅ | ✅ | ✅ |
| `atlas_cycle` | Trigger ATLAS discovery cycle | ✅ | — | — | — |
| `spawn` | Spawn a sub-agent | ✅* | — | — | — |

*CORTEX/coordinator only — not available to individual executives.

### Safety Guarantees (SINEW + ExfilGuard)

- `.env`, `*.key`, `*.pem` path access — **blocked at sandbox level**
- Output scrubbing — API keys, tokens, passwords **removed** before LLM sees them
- Shell injection — command argument validation on all `exec` calls
- Self-modification guard — no writes to `singularity/nexus/` by non-NEXUS tools
- Per-role timeout enforcement — default 30s, configurable per role
- Output cap — prevents runaway tool output consuming context window

---

## Executive Agents (C-Suite)

Executives are **ephemeral, scoped agent instances**. Each one:

- Has a defined domain and keyword routing table
- Gets scoped tool access (CISO can't deploy; CTO can't approve budgets)
- Produces structured reports before completion
- Runs within an iteration budget (default: 8)
- Is spawned on-demand and terminated after delivering results
- Escalates automatically on failure via the Self-Heal Engine

```bash
# Propose a new executive
python3 -m singularity.cli.main spawn-exec cto

# Output:
#   📋 Title:    Chief Technology Officer
#   🔧 Tools:    read, write, edit, exec, web_fetch
#   🔍 Keywords: 27 routing keywords
#   📊 Audit:    6 check types
#
#   Approve? [y/n]

python3 -m singularity.cli.main spawn-exec cto --approve
```

### Available Executive Roles

| Role | Emoji | Domain | Industry |
|------|-------|--------|---------|
| CTO | 🔧 | Engineering, infrastructure, architecture, deployments | All |
| COO | 📋 | Operations, workflows, compliance, project tracking | All |
| CFO | 💰 | Finance, budgets, revenue, pricing, runway | All |
| CISO | 🛡️ | Security, GRC, vulnerability assessment, access control | All |
| CRO | ⚖️ | Risk management, regulatory compliance, market risk | Fintech/Banking |
| CPO | 🎯 | Product strategy, roadmap, feature prioritization | SaaS/Platform |
| CMO | 📣 | Marketing, brand, growth, campaigns | E-Commerce/SaaS |
| CDO | 📊 | Data strategy, pipelines, ML/AI infrastructure | AI/ML/Healthcare |
| CCO | 📜 | Regulatory compliance, legal, policy, licensing | Healthcare/Pharma |

### Industry-Aware Role Proposals

| Industry | Additional Roles | Why |
|----------|-----------------|-----|
| **Fintech / Banking** | CRO, CCO | Regulatory exposure, financial risk |
| **Healthcare / Pharma** | CCO, CDO | HIPAA, patient data governance |
| **SaaS / Platform** | CPO, CMO | Product-market fit, growth |
| **Aerospace / Defense** | CTO+, CISO+, CDO | Classification, supply chain security |
| **E-Commerce** | CMO, CPO, CDO | Conversion, catalog, analytics |
| **AI / ML** | CTO+, CDO, CRO | Model governance, data quality, AI risk |

### Self-Heal Engine

When an executive fails, the self-heal engine classifies the failure and applies a strategy automatically:

| Strategy | Trigger | Action |
|----------|---------|--------|
| `RETRY` | Rate limit, network blip, timeout | Re-dispatch with exponential backoff (2s → 5s → 15s) |
| `REROUTE` | Auth failure, quota exhausted, model unavailable | Rotate provider chain, re-dispatch |
| `EXPAND` | Iteration cap hit | Increase `max_iterations` up to 50, re-dispatch |
| `PATCH` | ImportError, AttributeError, code bugs | Dispatch repair task to CTO, hot-reload fixed module |
| `ESCALATE` | All strategies exhausted | Alert #bridge, write post-mortem |

Circuit breaker: 5 failures in 5 minutes → circuit opens for 60s.

---

## Product Owner Agents (POA)

POAs are **persistent monitors** for live products. Each POA runs on a cron schedule and checks:

| Check | What It Monitors |
|-------|------------------|
| **Endpoints** | HTTP status, latency, response body validation |
| **SSL** | Certificate expiry, issuer, chain validity |
| **Service** | systemd/Docker status, uptime, restart count |
| **Disk** | Usage %, free space against threshold |
| **Memory** | System memory pressure |
| **Logs** | Journal errors, critical log entries |
| **Nginx** | Error log entries, config validity |

```bash
# Create a POA
python3 -m singularity.cli.main poa create "My API" \
  --endpoint https://api.example.com/health \
  --approve

# Run immediate audit
python3 -m singularity.cli.main poa audit my-api

# List all POAs
python3 -m singularity.cli.main poa list
```

POA lifecycle: `PROPOSED → APPROVED → ACTIVE → PAUSED → RETIRED`

Audits produce structured JSON + Markdown reports in `.singularity/audits/`.
Severity: `GREEN` → `YELLOW` → `RED` → escalation to Discord `#dispatch`.

### Release Manager

POA includes an autonomous GitHub release pipeline triggered by PULSE every 4h:

1. `git log <last_tag>..HEAD` — detect unreleased commits
2. Classify by conventional commit type (`feat:`, `fix:`, `BREAKING CHANGE:`)
3. Determine semver bump (`major` / `minor` / `patch`)
4. Generate changelog
5. **Await Singularity confirmation**
6. `git tag -a <version>` + `gh release create <version>`

---

## ATLAS — Enterprise Topology

ATLAS auto-discovers every running module in your enterprise — no manual registration. If it exists, ATLAS finds it.

**Discovery sources:**
- `systemd` unit files (user + system services)
- `ss -tlnp` — all listening ports
- nginx `sites-enabled/` — backend mapping
- Cloudflare tunnel config — public hostnames
- Process table — CPU/RAM usage
- SSH probes to remote machines
- Known module registry (curated hints)

**Coach evaluation** runs 6 fitness dimensions per module: health, performance, security, configuration, freshness, capacity.

**Board report** generated every 6h — executive summary, topology ASCII map, issues by severity, host resources, auto-actions taken.

---

## NEXUS — Self-Optimization

NEXUS reads Singularity's own source code, finds anti-patterns, and applies fixes with full rollback capability.

```bash
# Audit mode — scan, report, no changes
nexus_audit

# Evolution mode — find and apply safe mechanical fixes
nexus_evolve

# Rollback everything NEXUS has changed
nexus_rollback all
```

**Safe auto-evolutions:**
- Silent exceptions (`except: pass`) → add `logger.debug()` call
- Bare excepts (`except:`) → typed `except Exception:`
- Dead imports → remove after AST verification
- Missing async cleanup in generators → add `try/finally` guard

**Hot-swap journal:** Every function swap is journaled to disk. Survives process crashes. Rollback is instant.

---

## Self-Scaling

Singularity adapts its footprint to your organization:

| Org Size | Executives | POAs | Audit Cycle |
|----------|-----------|------|-------------|
| **Solo** (1–5) | CEO | 1–2 | Daily |
| **Startup** (5–50) | CEO + CTO + COO | Per product | 6h |
| **SMB** (50–500) | Full C-Suite | Per product | 4h |
| **Enterprise** (500+) | C-Suite + VPs | Per product family | 2h |

Tier is auto-detected from workspace audit. Override with `--tier`.

---

## CLI Reference

```bash
python3 -m singularity.cli.main <command> [options]

Commands:
  init          Initialize workspace (interactive wizard)
  audit         Run workspace audit
  status        Show runtime status
  spawn-exec    Propose/create an executive agent
  poa           POA management (create|list|audit|pause|retire)
  scale-report  Scaling analysis + role recommendations
  health        System health check
  test          Run end-to-end test suite
```

| Command | Key Options |
|---------|-------------|
| `init` | `--workspace PATH`, `--industry TYPE`, `--non-interactive` |
| `audit` | `--workspace PATH`, `--full`, `--output FILE` |
| `status` | `--json` |
| `spawn-exec ROLE` | `--approve`, `--enterprise NAME` |
| `poa create NAME` | `--endpoint URL`, `--service NAME`, `--approve` |
| `poa audit ID` | |
| `scale-report` | `--workspace PATH`, `--industry TYPE` |
| `health` | `--verbose` |

### Dispatch Script

```bash
# Drop a task into the C-Suite inbox
python3 scripts/dispatch.py ciso "Audit all listening ports" -p medium
python3 scripts/dispatch.py cto "Review infrastructure architecture" -p high
python3 scripts/dispatch.py all "Prepare weekly board report" -p normal
```

---

## Configuration

Layered configuration priority (highest to lowest):

1. **CLI arguments** — per-invocation overrides
2. **Environment variables** — `SINGULARITY_{SECTION}_{KEY}` (uppercase, underscores)
3. **`config/singularity.yaml`** — primary config file
4. **Defaults** — hardcoded fallbacks

Key configuration sections:

```yaml
voice:
  primary_model: "claude-sonnet-4"
  fallback_models: ["gemini-2.0-flash", "gpt-4.1-mini"]
  proxy:
    base_url: "http://localhost:3000/v1"   # GitHub Copilot proxy
  ollama:
    enabled: true
    base_url: "http://localhost:11434"

discord:
  token: ""                                # SINGULARITY_DISCORD_TOKEN
  require_mention: true
  dm_policy: "allowlist"

memory:
  max_context_tokens: 100000
  recall_on_boot: true

pulse:
  default_cap: 20
  expanded_cap: 100
  expand_threshold: 18

tools:
  exec_timeout: 30
  exec_max_output: 50000
```

See `config/singularity.example.yaml` for full reference.

---

## Infrastructure

Singularity operates alongside these infrastructure components:

| Component | Role | Required |
|-----------|------|---------|
| **Python 3.11+** | Runtime language | Yes |
| **comb-db** | Cross-session memory persistence | Yes |
| **Anthropic API** | Primary LLM provider | Recommended |
| **Ollama** | Local/sovereign LLM fallback | Recommended |
| **GitHub Copilot Proxy** | Local LLM proxy (localhost:3000) | Optional |
| **Discord Bot** | Communication channel | Optional |
| **systemd** | Service management (for POA monitoring) | Optional |
| **gh CLI** | Release Manager GitHub integration | Optional |

### LLM Provider Chain

```
Primary: Anthropic claude-sonnet-4
    ↓ (3 consecutive failures → circuit open)
Fallback: GitHub Copilot Proxy (localhost:3000)
    ↓ (3 consecutive failures → circuit open)
Local: Ollama (sovereign mode — zero external dependencies)
    ↓ (all fail)
Degraded: structured error response (system stays up)
```

### Runtime State Directories

```
.singularity/
├── audits/                     # POA audit reports (JSON + MD)
├── csuite/
│   ├── inbox/                  # Dispatch requests (2s poll)
│   ├── results/                # Results keyed by request_id
│   └── dispatches/             # Permanent dispatch archive
├── deployments/                # Discord deployment state
├── nexus/
│   └── results/                # Optimization run results
├── poas/
│   └── <product-id>/
│       ├── config.json         # POA configuration
│       ├── logs/               # Audit logs
│       └── audits/             # Audit reports
├── atlas/
│   ├── topology.json           # Persisted topology graph
│   ├── visibility.json         # Hidden module index
│   └── actions.jsonl           # Auto-fix action log
└── sessions.db                 # SQLite session store
```

---

## Testing

```bash
# Run the full end-to-end test suite
python3 tests/test_e2e.py

# 30 tests across all subsystems:
#   bus, config, memory, tools, voice, cortex, nerve,
#   pulse, csuite, poa, scaling (6 industries), immune
```

All tests run without external dependencies. No API keys, no databases, no network.

---

## The Stack

Singularity is built on a constellation of purpose-built systems:

| Component | Role | Link |
|-----------|------|------|
| **COMB** | Cross-compaction lossless memory | `comb-db` (PyPI) |
| **Mach6** | Agent runtime framework (AVA) | [Artifact-Virtual/mach6](https://github.com/Artifact-Virtual/mach6) |
| **HEKTOR** | In-process BM25 workspace search | Built-in (`singularity/memory/hektor.py`) |
| **GLADIUS** | Native transformer architecture | In training |

Each built from first principles. No wrappers over abstractions.

---

## Codebase

```
Language      Files    Lines
──────────────────────────────
Python          65+   24,000+
YAML             5       450+
Markdown        45+   7,500+
Shell            5       240+
──────────────────────────────
Total          120+   32,000+
```

Built in 28 days. Running in production across live products and real customers.

---

## Documentation

| Document | What It Covers |
|----------|---------------|
| [docs/architecture.md](docs/architecture.md) | Full system diagram, boot phases, all data flows |
| [docs/atlas.md](docs/atlas.md) | ATLAS board manager: discovery, topology, coach, reports |
| [docs/nexus.md](docs/nexus.md) | NEXUS self-optimization: analyzer, hot-swap, evolution |
| [docs/csuite.md](docs/csuite.md) | C-Suite delegation: roles, dispatch, self-heal engine |
| [docs/poa.md](docs/poa.md) | Product Owner Agents: monitoring, release pipeline |
| [docs/sentinel.md](docs/sentinel.md) | ExfilGuard + Sentinel security layer |
| [BOOTSTRAP.md](BOOTSTRAP.md) | Operational discipline: memory, delegation, iteration budgeting |
| [FLOW.md](FLOW.md) | Complete C-Suite dispatch trace with timing data |
| [CHANGELOG.md](CHANGELOG.md) | Full feature history Days 1–28 |
| [DEPENDENCIES.md](DEPENDENCIES.md) | Technology decisions with rationale |

---

## Philosophy

### Heal Faster Than You Degrade

The Turing Problem: everything degrades. Software rots. Services crash. Networks fail. Entropy wins — unless you build immune systems that heal faster than things break. Singularity doesn't prevent failure. It recovers from it before anyone notices.

### Roles Follow the Workspace

Singularity doesn't impose structure. It discovers what you have and proposes what you need. A fintech company gets a CRO. A healthcare company gets a CCO. A solo founder gets minimal overhead. The workspace is the truth. The org chart follows.

### Approval Gates, Not Automation Gates

Monitoring is autonomous. Mutation is gated. Every executive spawn, every POA deployment, every production action requires explicit human approval. Singularity proposes. You decide. Always.

### Single Trigger → Butterfly Effects

One event on the bus can cascade through every subsystem. A health check failure triggers an alert, a restart, a status update, and a report. All through the event bus. Loose coupling. Tight coordination.

### Zero Vendor Lock-In

No OpenAI dependency. No Anthropic dependency. No cloud dependency. The provider chain falls through automatically: cloud → proxy → local. Your enterprise doesn't stop because a vendor has an outage.

### Self-Improvement Is the Point

COMB for persistence, BLINK for continuation, PULSE for scheduling, NEXUS for self-optimization, C-Suite for delegation, POA for monitoring. These are the evolutionary mechanisms. Hit a wall → build a system to get past it → encode it → move forward permanently improved.

---

<p align="center">
  <strong>Artifact Virtual</strong><br/>
  <em>Two dots and an arrow between them.</em><br/><br/>
  <sub>Built by Ali Shakil & AVA · 2026</sub>
</p>
