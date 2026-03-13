# Security

> Sentinel, ExfilGuard, OpenAnt, safety boundaries, and operational security.

## Overview

Singularity implements defense-in-depth through multiple security layers:

1. **Sentinel** — Real-time network monitoring daemon
2. **ExfilGuard** — Data exfiltration detection
3. **OpenAnt** — Anti-tampering integrity checks
4. **Credential Guard** — Command-level secret leak prevention
5. **Safety Boundaries** — Operational guardrails for autonomous actions

---

## Sentinel

Sentinel is a standalone security daemon that monitors network activity in real-time.

### What It Does

- Monitors all outbound network connections
- Tracks connection frequency per IP/port
- Detects anomalous connection patterns
- Alerts on first-sight connections to unknown IPs
- Maintains a whitelist of known-safe networks

### Configuration

Whitelist file: `/home/adam/workspace/singularity/.singularity/sentinel/whitelist.json`

```json
{
  "networks": [
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "140.82.112.0/20",
    "199.232.0.0/16"
  ],
  "domains": [
    "github.com",
    "githubusercontent.com",
    "cloudflare.com",
    "fastly.net"
  ]
}
```

### Alerts

When Sentinel detects suspicious activity, it dispatches to the CISO executive and posts to Discord #dispatch. Alert levels:

- **HIGH** — First-sight IP with high connection rate, potential exfiltration
- **MEDIUM** — Known CDN/cloud IP but unusual pattern
- **LOW** — Informational, new but benign-looking connection

### Known Issue

Sentinel loads the whitelist at startup only. After modifying `whitelist.json`, restart Sentinel for changes to take effect:

```bash
systemctl --user restart sentinel
```

> **Note:** A permanent fix (inotify watch for hot-reload) is planned.

---

## ExfilGuard

ExfilGuard is the exfiltration detection subsystem within Sentinel.

### Detection Criteria

- **Connection burst:** >20 connections to a single IP within 60 seconds
- **First-sight IP:** IP never seen before in the scan history
- **High send volume:** Outbound data exceeding baseline for the process
- **Suspicious ports:** Non-standard ports for the detected service

### Investigation Flow

When ExfilGuard triggers:

1. Singularity identifies the process (PID, command, parent)
2. Reverse DNS lookup on the destination IP
3. ASN/WHOIS lookup for network ownership
4. Cross-reference against known CDN/cloud CIDRs
5. Classify as **true positive** or **false positive**
6. If false positive → add to whitelist, restart Sentinel
7. If true positive → escalate to operator immediately

---

## Credential Guard

Built into the `exec` tool — prevents accidental credential leaks in shell commands.

### What It Blocks

- API keys, tokens, or secrets passed as literal values in commands
- `grep` or `cat` commands that would output credential files
- Any command containing patterns matching known secret formats

### How It Works

Before executing any shell command, the tool scans the command string for:
- Strings matching API key patterns (length, entropy, prefixes)
- Known environment variable names containing secrets
- Direct file reads of known credential files

If detected, the command is blocked with:
```
Blocked: Credential leak blocked: command contains API keys, tokens, or secrets.
Use environment variables or vault — never pass credentials as literal values in commands.
```

---

## Safety Boundaries

Singularity operates under defined autonomy boundaries.

### Requires Operator Approval

These actions are **never** taken autonomously:

- Creating or activating new C-Suite executives
- Creating or activating new POAs
- Modifying production deployments
- Sending external communications (email, social media, PR)
- Deleting repositories or services
- Changing authentication or access controls
- Modifying other agents' identity files (AVA, Aria)

### Autonomous (No Approval)

These actions are taken freely as part of normal operation:

- Read-only workspace audits
- Health checks and monitoring
- Report generation and alerting
- Self-healing (restarting own subsystems)
- Configuration hot-reload
- NEXUS safe evolutions (silent exceptions, bare excepts, missing loggers)
- Web research and memory search
- VDB indexing and search

### Decision Framework

When uncertain: **Audit, don't act. Propose, don't execute.**

---

## Operational Security Practices

### Secrets Management

- All secrets stored in `.env` files, never in source code
- `.env` files are gitignored across all repositories
- Only `.env.example` files (with placeholder values) are tracked
- Secrets scan runs on every release cycle

### Network Security

- All public endpoints behind Cloudflare proxy (DDoS protection)
- Cloudflare Tunnel for zero-trust access (no exposed ports)
- Internal services bound to localhost or private IPs
- Nginx reverse proxy for internal service routing

### Audit Trail

- All C-Suite dispatch results archived in `executives/` directory
- POA audit history maintained with timestamps (append-only)
- Git history for all code changes
- systemd journal for runtime logs

---

*See [Deployment](deployment.md) for hardening, [Infrastructure](infrastructure.md) for network layout.*
