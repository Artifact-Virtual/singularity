# Singularity — Documentation

> Autonomous Enterprise Runtime by Artifact Virtual

---

## Quick Navigation

| Section | Description |
|---------|-------------|
| [Overview](overview.md) | What Singularity is, core philosophy, and design principles |
| [Architecture](architecture.md) | System architecture, 13 subsystems, data flow |
| [Getting Started](getting-started.md) | Installation, configuration, first boot |
| [Subsystems](subsystems/README.md) | Deep-dive into each subsystem |
| [Tools Reference](tools-reference.md) | All 28 native tools — usage, parameters, examples |
| [C-Suite Delegation](csuite.md) | CTO, COO, CFO, CISO executive agents |
| [Memory & Persistence](memory.md) | COMB, VDB, HEKTOR, session management |
| [Self-Optimization](nexus.md) | NEXUS engine — audit, evolve, hot-swap |
| [Product Monitoring](poa.md) | POA agents — health checks, uptime, alerts |
| [Infrastructure](infrastructure.md) | Servers, services, networking, tunnels |
| [Security](security.md) | Sentinel, ExfilGuard, OpenAnt, access controls |
| [API Reference](api.md) | HTTP API (:8450), endpoints, authentication |
| [Configuration](configuration.md) | Environment variables, config files, tuning |
| [Deployment](deployment.md) | systemd, Docker, production checklist |
| [Contributing](contributing.md) | Development workflow, code standards, PR process |
| [Changelog](changelog.md) | Release history and version notes |

---

## Subsystem Index

| Subsystem | Module | Purpose |
|-----------|--------|---------|
| [CORTEX](subsystems/cortex.md) | `singularity.cortex` | Agent loop, planner, tool orchestration, BLINK continuation |
| [SINEW](subsystems/sinew.md) | `singularity.sinew` | Tool definitions, execution, sandboxing |
| [VOICE](subsystems/voice.md) | `singularity.voice` | LLM provider chain — Copilot → HuggingFace → Ollama |
| [MEMORY](subsystems/memory.md) | `singularity.memory` | COMB persistence, VDB search, session management |
| [C-SUITE](subsystems/csuite.md) | `singularity.csuite` | Executive delegation — CTO, COO, CFO, CISO |
| [NEXUS](subsystems/nexus.md) | `singularity.nexus` | Self-optimization — AST analysis, hot-swap, evolution |
| [PULSE](subsystems/pulse.md) | `singularity.pulse` | Scheduling — cron, timers, iteration budgets |
| [POA](subsystems/poa.md) | `singularity.poa` | Product Owner Agents — health, uptime, releases |
| [IMMUNE](subsystems/immune.md) | `singularity.immune` | Self-healing — watchdog, vitals, auto-recovery |
| [NERVE](subsystems/nerve.md) | `singularity.nerve` | Communications — Discord, HTTP API, message routing |
| [ATLAS](subsystems/atlas.md) | `singularity.atlas` | Enterprise topology — module discovery, board reports |
| [AUDITOR](subsystems/auditor.md) | `singularity.auditor` | Operational auditing, release management, changelogs |
| [CLI](subsystems/cli.md) | `singularity.cli` | Command-line interface — setup, diagnostics |

---

## At a Glance

- **Language:** Python 3.11+ / asyncio
- **Codebase:** 83 files, ~33,000 lines
- **Tools:** 28 native
- **Subsystems:** 13
- **License:** AGPL-3.0-or-later
- **Created:** 2026-03-03 (Day 19)
- **Builder:** AVA (Ava Shakil)
- **Architect:** Ali Shakil, CEO — Artifact Virtual

---

*Built by AVA. Designed by Ali. For the enterprise that runs itself.*
