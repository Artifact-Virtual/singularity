# Singularity \[AE] — Documentation

> Autonomous Enterprise Runtime — Built by AVA, Designed by Ali, For the enterprise that runs itself.

## Quick Navigation

### Getting Started

| Document | Description |
|----------|-------------|
| [Overview](overview.md) | What Singularity is, what it does, and why it exists |
| [Getting Started](getting-started.md) | Installation, setup wizard, first run |
| [Configuration](configuration.md) | Environment variables, YAML config, tuning |
| [Deployment](deployment.md) | systemd, production hardening, multi-machine |

### Architecture & Systems

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | System design — 13 subsystems, data flow, design philosophy |
| [Architecture Reference](ARCHITECTURE.md) | Deep-dive technical reference (974 lines) |
| [Infrastructure](infrastructure.md) | Servers, services, networking, public URLs |

### Subsystems

| Document | Description |
|----------|-------------|
| [C-Suite](csuite.md) | Executive delegation — CTO, COO, CFO, CISO, CMO |
| [Memory & COMB](memory.md) | Persistence — COMB staging, session continuity, HEKTOR search |
| [NEXUS](nexus.md) | Self-optimization — audit, evolve, hot-swap, AST analysis |
| [POA](poa.md) | Product Owner Agents — health monitoring, uptime, alerting |
| [VDB](vdb.md) | Native Vector Database — BM25 + TF-IDF hybrid search engine |

### Reference

| Document | Description |
|----------|-------------|
| [Tools Reference](tools-reference.md) | All 28 native tools — parameters, examples, scoping |
| [API](api.md) | HTTP API (:8450) — endpoints, authentication, payloads |
| [Security](security.md) | Sentinel, ExfilGuard, OpenAnt, safety boundaries |

### Project

| Document | Description |
|----------|-------------|
| [Changelog](changelog.md) | Version history — v0.1.0 through v0.6.0 |
| [Contributing](contributing.md) | Development workflow, code standards, PR process |

---

## At a Glance

- **Runtime:** Python 3.11+ / asyncio
- **Codebase:** 83 files, ~31,261 lines
- **Subsystems:** 13 (all operational)
- **Tools:** 28 native
- **License:** AGPL-3.0-or-later
- **Status:** Production — powering Artifact Virtual

## Systems Map

```
┌─────────────────────────────────────────────────────┐
│                   SINGULARITY [AE]                  │
├──────────┬──────────┬──────────┬───────────────────┤
│ CORTEX   │ VOICE    │ NERVE    │ MEMORY            │
│ (Brain)  │ (LLM)   │ (Comms)  │ (COMB+VDB+HEKTOR) │
├──────────┼──────────┼──────────┼───────────────────┤
│ CSUITE   │ NEXUS    │ PULSE    │ POA               │
│ (Deleg.) │ (Evolve) │ (Sched.) │ (Products)        │
├──────────┼──────────┼──────────┼───────────────────┤
│ IMMUNE   │ ATLAS    │ AUDITOR  │ SINEW             │
│ (Health) │ (Topo.)  │ (Ops)    │ (Tools)           │
├──────────┴──────────┴──────────┼───────────────────┤
│ SENTINEL (Security)            │ CLI (Interface)   │
└────────────────────────────────┴───────────────────┘
```

---

*Built by [AVA](https://github.com/Artifact-Virtual). Designed by Ali Shakil. Licensed under AGPL-3.0-or-later.*
