# Tools Reference

Singularity exposes 28 native tools organized into 8 domains. Each tool is available to the agent loop and, where scoped, to C-Suite executives.

---

## Core Tools

### `exec`
Execute a shell command and return stdout + stderr.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | ✅ | Shell command to execute |
| `workdir` | string | ❌ | Working directory (default: workspace) |
| `timeout` | number | ❌ | Timeout in seconds (default: 30) |
| `background` | boolean | ❌ | Run in background, returns PID |

**Security:** Commands are sandboxed. Credential leaks are blocked by ExfilGuard.

---

### `read`
Read file contents with optional range.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | ✅ | Absolute file path |
| `offset` | number | ❌ | Starting line (1-indexed) |
| `limit` | number | ❌ | Max lines to read |

---

### `write`
Write content to a file. Creates parent directories automatically.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | ✅ | Absolute file path |
| `content` | string | ✅ | File content |

---

### `edit`
Edit a file by finding and replacing exact text.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | ✅ | Absolute file path |
| `oldText` | string | ✅ | Exact text to find |
| `newText` | string | ✅ | Replacement text |

---

### `web_fetch`
Fetch content from a URL and return text.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✅ | URL to fetch |
| `maxChars` | number | ❌ | Max characters to return (default: 50000) |

---

## Communication Tools

### `discord_send`
Send a message to a Discord channel.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel_id` | string | ✅ | Discord channel ID |
| `content` | string | ✅ | Message content |

---

### `discord_react`
React to a Discord message with an emoji.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel_id` | string | ✅ | Channel ID |
| `message_id` | string | ✅ | Message ID |
| `emoji` | string | ✅ | Emoji to react with |

---

## Memory Tools

### `comb_stage`
Stage information in COMB for the next session. Persists across restarts.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | ✅ | Information to stage |

---

### `comb_recall`
Recall operational memory from COMB. Returns all staged entries.

*No parameters.*

---

### `memory_recall`
Search persistent memory using the native VDB (BM25 + TF-IDF hybrid search).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | ✅ | Search query |
| `k` | number | ❌ | Number of results (default: 5) |
| `source` | string | ❌ | Filter: discord, whatsapp, comb, identity, memory |

---

### `memory_ingest`
Ingest conversation history and files into persistent memory (VDB).

*No parameters. Runs automatic deduplication.*

---

### `memory_stats`
Show VDB database statistics — document count, terms, disk usage, source breakdown.

*No parameters.*

---

## NEXUS Tools (Self-Optimization)

### `nexus_audit`
Scan Singularity's own codebase for quality issues.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `target` | string | ❌ | Specific file or subdirectory to scan |
| `mode` | string | ❌ | audit, propose, optimize, report (default: audit) |

---

### `nexus_status`
Get current NEXUS engine status — active hot-swaps, run count, journal entries.

*No parameters.*

---

### `nexus_swap`
Hot-swap a live function at runtime with new source code.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `module_name` | string | ✅ | Python module path (e.g. `singularity.cortex.agent`) |
| `function_name` | string | ✅ | Function to replace |
| `new_source` | string | ✅ | New function source code |
| `reason` | string | ✅ | Reason for the swap |
| `class_name` | string | ❌ | Class name if swapping a method |

---

### `nexus_rollback`
Rollback a NEXUS hot-swap.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `swap_id` | string | ✅ | Swap ID to rollback, or 'all' |

---

### `nexus_evolve`
Run self-evolution cycle — find safe mechanical transformations and apply them.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `target` | string | ❌ | Specific file or subdirectory |
| `dry_run` | boolean | ❌ | Find but don't apply (default: true) |
| `max_evolutions` | number | ❌ | Max changes to apply (default: 50) |

---

## Delegation Tools

### `csuite_dispatch`
Dispatch a task to C-Suite executives.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `description` | string | ✅ | Task description |
| `target` | string | ❌ | auto, all, cto, coo, cfo, ciso (default: auto) |
| `priority` | string | ❌ | low, normal, high, critical (default: normal) |
| `max_iterations` | number | ❌ | Max agent iterations (default: 25) |

---

## Product Monitoring Tools

### `poa_setup`
Run double-audit setup flow on a workspace. Scans for products, classifies, generates configs.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace` | string | ❌ | Workspace path (default: current) |
| `auto_approve` | boolean | ❌ | Auto-approve green POAs (default: false) |

---

### `poa_manage`
Manage POA lifecycle.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | ✅ | list, status, audit, kill, pause, resume |
| `product_id` | string | ❌ | Product ID (required for audit/kill/pause/resume) |

---

## Topology Tools

### `atlas_status`
Get ATLAS board manager status — module counts, health summary.

*No parameters.*

---

### `atlas_topology`
Get enterprise topology map — all modules, machines, connections.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_hidden` | boolean | ❌ | Include hidden modules (default: false) |

---

### `atlas_module`
Get detailed report for a specific module.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `module_id` | string | ✅ | Module ID (e.g. 'singularity', 'mach6-gateway') |

---

### `atlas_report`
Generate full ATLAS board report — enterprise-wide status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_hidden` | boolean | ❌ | Include hidden modules (default: false) |

---

### `atlas_visibility`
Manage module visibility. Hide confidential modules from reports.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | ✅ | list, hide, show |
| `module_id` | string | ❌ | Module ID (required for hide/show) |

---

## Release Tools

### `release_scan`
Scan all tracked repos for unreleased commits. Returns proposals with semver bumps.

*No parameters.*

---

### `release_status`
Get release manager status — tracked repos, pending proposals.

*No parameters.*

---

### `release_confirm`
Confirm a pending release proposal.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product_id` | string | ✅ | Product ID to confirm |

---

### `release_ship`
Ship a confirmed release — tag, push, GitHub release with changelog.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product_id` | string | ✅ | Product ID to ship |

---

### `release_reject`
Reject a pending release proposal.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product_id` | string | ✅ | Product ID to reject |

---

## Tool Access by Role

| Tool | Singularity | CTO | COO | CFO | CISO |
|------|:-----------:|:---:|:---:|:---:|:----:|
| exec | ✅ | ✅ | ❌ | ❌ | ✅ |
| read | ✅ | ✅ | ✅ | ✅ | ✅ |
| write | ✅ | ✅ | ❌ | ❌ | ❌ |
| edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| web_fetch | ✅ | ✅ | ✅ | ✅ | ✅ |
| discord_send | ✅ | ✅ | ✅ | ✅ | ✅ |
| csuite_dispatch | ✅ | ❌ | ❌ | ❌ | ❌ |
| comb_stage | ✅ | ❌ | ❌ | ❌ | ❌ |
| nexus_* | ✅ | ❌ | ❌ | ❌ | ❌ |
| poa_* | ✅ | ❌ | ❌ | ❌ | ❌ |
| atlas_* | ✅ | ❌ | ❌ | ❌ | ❌ |
| release_* | ✅ | ❌ | ❌ | ❌ | ❌ |

---

*Next: [C-Suite Delegation →](csuite.md)*
