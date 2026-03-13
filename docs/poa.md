# Product Monitoring (POA)

Every shipped product gets a Product Owner Agent (POA). POAs continuously monitor health, track uptime, and escalate degradation.

---

## What a POA Owns

- **Health checks** — HTTP endpoints, SSL certificate validity, service ports, response times
- **Uptime tracking** — Historical availability data, SLA compliance
- **Alert escalation** — RED/YELLOW status → Discord #dispatch notification
- **Audit history** — Timestamped, append-only audit trail

---

## Lifecycle

```
Detect product → Generate config → Operator approval → Deploy → Schedule audits → Monitor
```

### Detection
`poa_setup` scans the workspace for products:
- Phase 1: Broad scan — find anything that looks like a shipped product
- Phase 2: Review & tighten — classify real products vs. noise
- Phase 3: Focused audit — health checks on real products
- Phase 4: Present proposals for operator approval

### Configuration
Each POA gets a config specifying:
- Product name and ID
- Health check endpoints (URLs, expected status codes)
- SSL check targets
- Port monitoring
- Alert thresholds

### Monitoring
PULSE schedules POA audits every 4 hours per product. Each audit:
1. Checks all configured endpoints
2. Validates SSL certificates
3. Tests port connectivity
4. Records results in audit trail
5. Calculates health status (GREEN/YELLOW/RED)
6. Escalates if degraded

---

## Health Status

| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 GREEN | All checks passing | No action |
| 🟡 YELLOW | Partial degradation | Alert to #dispatch |
| 🔴 RED | Service down or critical failure | Immediate escalation |

---

## Management

```
poa_manage(action="list")                    # List all POAs
poa_manage(action="status")                  # Health summary
poa_manage(action="audit", product_id="gdi") # Force audit now
poa_manage(action="pause", product_id="gdi") # Pause monitoring
poa_manage(action="resume", product_id="gdi")# Resume monitoring
poa_manage(action="kill", product_id="gdi")  # Remove POA
```

---

## Active POAs (Current)

| Product | ID | Endpoints |
|---------|-----|-----------|
| Singularity | singularity | singularity.artifactvirtual.com |
| Artifact ERP | artifact-erp | erp.artifactvirtual.com |
| GDI | gdi | gdi.artifactvirtual.com |
| COMB Cloud | comb-cloud | comb.artifactvirtual.com |
| Mach6 Gateway | mach6-gateway | mach6.artifactvirtual.com |
| GLADIUS | gladius | gladius-three.vercel.app |

---

*Next: [Infrastructure →](infrastructure.md)*
