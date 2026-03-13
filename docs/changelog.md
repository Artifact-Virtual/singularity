# Changelog

> All notable changes to Singularity, tracked by version.

---

## v0.6.0 (2026-03-13) — Public Launch

- **license:** Switch from proprietary to AGPL-3.0-or-later
- **docs:** Update stats to match codebase (83 files, 31,261 lines)
- **landing:** Remove boot sequence demo and chat widget
- **security:** Remove chat widget from landing page (prevents unauthorized token consumption)
- **feat:** HuggingFace Inference provider added to voice chain
- **fix:** Capture partial progress on executive timeout (eliminates phantom dispatches)
- **fix:** Increase CTO/CMO executive timeouts
- **fix:** Discord formatting rules — no markdown tables/headers in chat output
- **feat:** Finalized landing page with favicon, SEO meta, JSON-LD, OG tags
- **infra:** singularity.artifactvirtual.com live via Cloudflare Tunnel

---

## v0.5.0 (2026-03-13) — Landing Page

- **feat:** Production landing page for singularity.artifactvirtual.com

---

## v0.4.2 (2026-03-13) — Documentation

- **docs:** World-class README for public launch
- **docs:** IDENTITY updated — 28 tools, 13 subsystems, 31K lines

---

## v0.4.1 (2026-03-12) — Stability

- **fix:** Context cap 20K tokens
- **fix:** Copilot proxy — handle client disconnect without crashing
- **chore:** Discovery cleanup, remove Aria manifest

---

## v0.4.0 (2026-03-12) — Setup Wizard

- **feat:** One-command install + interactive setup wizard
  - Workspace detection
  - Identity file generation
  - LLM provider configuration
  - COMB persistence setup
  - Sentinel security setup
  - systemd service installation
- **rebrand:** Mach6 → Symbiote across IDENTITY, ATLAS, POA

---

## v0.3.0 (2026-03-12) — C-Suite & Security

- **feat:** C-Suite dispatch results → Discord #bridge with @Singularity mention
- **feat:** CMO added to executive roster
- **fix:** ATLAS alert/discovery suppression
- **fix:** C-Suite bridge channel ID correction
- **fix:** Filter hidden/dormant modules from ATLAS cortex injection
- **fix:** SelfHealEngine initialization + session context overflow
- **security:** Unsandbox — full access authorized (Day 28)

---

## v0.2.0 (2026-03-12) — NEXUS & ExfilGuard

- **feat:** NEXUS evolution engine — expanded from 3 to 6 detection patterns
- **feat:** ExfilGuard → CISO auto-dispatch pipeline
- **feat:** POA Release Manager — autonomous release pipeline with GitHub integration
- **feat:** ATLAS discovery — module dedup, status reporting, edge classification
- **fix:** 15 silent exception handlers upgraded to logged exceptions
- **fix:** Rate-limit CISO dispatch (5min cooldown per IP)
- **fix:** C-Suite dispatch failures — max_tokens 8192→16384
- **security:** Sandbox hardening — credential leak prevention, .env blocking
- **docs:** ARCHITECTURE.md added (974 lines)
- 51 total commits

---

## v0.1.0 (2026-03-03) — Genesis

- **feat:** Singularity [AE] initial release
- Core agent loop (CORTEX)
- LLM provider chain (VOICE) — Copilot + Ollama
- Discord adapter (NERVE)
- COMB persistence (MEMORY)
- C-Suite delegation framework
- NEXUS self-optimization
- PULSE scheduler
- POA product monitoring
- IMMUNE self-healing
- ATLAS topology tracking
- 28 native tools
- 13 subsystems

---

*Full commit history: [GitHub](https://github.com/Artifact-Virtual/singularity/commits/main)*
