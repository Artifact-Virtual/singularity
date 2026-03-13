# C-Suite Delegation

Singularity delegates domain-specific work to specialized executive agents. Each executive has scoped tool access, its own system prompt, and a budget-limited agent loop.

---

## Executives

### CTO — Chief Technology Officer
**Domain:** Engineering, infrastructure, deployments, code review, architecture

**Tools:** exec, read, write, edit, web_fetch, discord_send

**Use cases:**
- Audit a codebase for quality issues
- Fix bugs and deploy patches
- Review infrastructure health
- Evaluate technology choices

### COO — Chief Operating Officer
**Domain:** Operations, processes, compliance, HR, workflows

**Tools:** read, web_fetch, discord_send

**Use cases:**
- Process audits and optimization
- Compliance reviews
- Workflow documentation
- Operational metrics

### CFO — Chief Financial Officer
**Domain:** Finance, budgets, pricing, revenue, costs

**Tools:** read, web_fetch, discord_send

**Use cases:**
- Pricing strategy analysis
- Revenue forecasting
- Cost optimization
- Financial reporting

### CISO — Chief Information Security Officer
**Domain:** Security, risk, GRC, vulnerability assessment, access control

**Tools:** exec, read, web_fetch, discord_send

**Use cases:**
- Security audits
- Vulnerability scanning
- ExfilGuard alert triage
- Access control review

---

## Dispatch Flow

```
Operator/System
    │
    ▼
Singularity (Coordinator)
    │
    ├── target: "auto"  → keyword-match routing
    ├── target: "cto"   → direct to CTO
    ├── target: "all"   → fan-out to all executives
    │
    ▼
Executive Agent Loop (scoped tools, budget-limited)
    │
    ▼
Singularity (Coordinator) ← synthesizes results
    │
    ▼
Response to Operator
```

---

## Dispatch Examples

### Auto-routing
```
csuite_dispatch(
  description="Audit the ERP backend for security vulnerabilities",
  target="auto"    # Routes to CISO based on "security" + "vulnerabilities"
)
```

### Direct routing
```
csuite_dispatch(
  description="Deploy the new API version to production",
  target="cto",
  priority="high"
)
```

### Fan-out
```
csuite_dispatch(
  description="Prepare Q1 2026 status report for all domains",
  target="all"
)
```

---

## Budget & Limits

| Parameter | Default | Description |
|-----------|---------|-------------|
| `max_iterations` | 25 | Maximum agent loop iterations per dispatch |
| Timeout (CTO) | 300s | Max wall-clock time |
| Timeout (COO) | 180s | Max wall-clock time |
| Timeout (CFO) | 180s | Max wall-clock time |
| Timeout (CISO) | 300s | Max wall-clock time |

When an executive exceeds its budget, partial progress is captured and returned to the coordinator.

---

## Channels

Each executive has a dedicated Discord channel for reporting:

| Executive | Channel |
|-----------|---------|
| CTO | #cto |
| COO | #coo |
| CFO | #cfo |
| CISO | #ciso |

---

## Rules

1. No executive is created without operator approval
2. Tool access is scoped per role — executives cannot exceed their permissions
3. Budget is enforced — exceeded cap triggers auto-archive + alert
4. Contradictory recommendations → Singularity arbitrates → escalates if needed
5. Executives cannot dispatch other executives (no recursive delegation)
6. Each executive runs in isolation with its own context window

---

*Next: [Memory & Persistence →](memory.md)*
