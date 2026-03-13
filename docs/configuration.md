# Configuration

> Environment variables, YAML config, and runtime tuning.

## Environment Variables

Singularity loads environment from `.env` in the workspace root. Copy `.env.example` to `.env` and customize.

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token | `MTQ3ODQw...` |
| `COPILOT_PROXY_URL` | LLM proxy endpoint | `http://localhost:3000/v1/chat/completions` |

### LLM Providers

| Variable | Description | Default |
|----------|-------------|---------|
| `COPILOT_PROXY_URL` | Primary LLM endpoint (Copilot proxy) | `http://localhost:3000/v1/chat/completions` |
| `COPILOT_AUTH_TOKEN` | Auth token for Copilot proxy | — |
| `OLLAMA_BASE_URL` | Ollama fallback endpoint | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model name | `qwen2.5-coder:14b` |
| `HF_TOKEN` | HuggingFace API token (tertiary fallback) | — |
| `HF_TOKEN_AVA` | HuggingFace token (AVA account, priority) | — |
| `HF_TOKEN_ALI` | HuggingFace token (Ali account) | — |

### Memory & Persistence

| Variable | Description | Default |
|----------|-------------|---------|
| `COMB_ENABLED` | Enable COMB persistence | `true` |
| `VDB_PERSIST_DIR` | VDB storage directory | `.singularity/vdb` |

### Security

| Variable | Description | Default |
|----------|-------------|---------|
| `SENTINEL_ENABLED` | Enable Sentinel security daemon | `true` |
| `EXFIL_GUARD_ENABLED` | Enable ExfilGuard network monitoring | `true` |

### Infrastructure

| Variable | Description | Default |
|----------|-------------|---------|
| `SINGULARITY_HTTP_PORT` | HTTP API port | `8450` |
| `SINGULARITY_LOG_LEVEL` | Logging level | `INFO` |

### Alerting (Optional)

| Variable | Description |
|----------|-------------|
| `SINGULARITY_ALERT_EMAIL` | Email for critical alerts |
| `SINGULARITY_ALERT_WEBHOOK` | Slack/Discord webhook for alerts |

---

## YAML Configuration

Main config file: `config/singularity.yaml`

### Voice (LLM)

```yaml
voice:
  primary_model: claude-opus-4.6
  fallback_models:
    - qwen2.5-coder:14b
  provider_chain:
    - copilot
    - ollama
    - huggingface
  max_tokens: 16384
  temperature: 0.3
```

### Cortex (Agent Brain)

```yaml
cortex:
  max_iterations: 50
  executive_iterations: 25
  max_tool_calls_per_iteration: 5
  budget_warning_threshold: 5
```

### PULSE (Scheduler)

```yaml
pulse:
  poa_audit_interval: 14400  # 4 hours in seconds
  health_check_interval: 300  # 5 minutes
```

### C-Suite (Executives)

```yaml
csuite:
  executives:
    - name: CTO
      enabled: true
      timeout: 600
      max_iterations: 25
      tools:
        - exec
        - read
        - write
        - edit
        - web_fetch
    - name: COO
      enabled: true
      timeout: 300
      max_iterations: 25
    # ... CFO, CISO, CMO
```

### NEXUS (Self-Optimization)

```yaml
nexus:
  auto_evolve: false
  max_evolutions_per_cycle: 50
  safe_patterns:
    - silent_exceptions
    - bare_excepts
    - missing_loggers
```

### Immune (Self-Healing)

```yaml
immune:
  watchdog_interval: 60
  auto_restart: true
  max_restart_attempts: 3
  cooldown_seconds: 1.0
```

---

## Runtime Tuning

### Token Budget

The context window is managed by the Cortex engine:
- **Max context:** 90,000 tokens (conservative estimate at 3.2 chars/token)
- **Compaction:** Automatically triggered when approaching the limit
- **BLINK:** Extends iteration budget seamlessly across boundaries

### Provider Chain

The voice system uses a fallback chain:
1. **Copilot Proxy** (primary) — localhost:3000, proxies to cloud LLM
2. **Ollama** (fallback) — localhost:11434, local inference
3. **HuggingFace** (tertiary) — cloud API, credit-limited

Circuit breaker pattern: if primary fails 3x, automatic fallback to next provider with exponential backoff.

### Memory Sizing

- **VDB:** Grows with indexed content. ~300KB for 130 documents. No hard limit.
- **COMB:** Each stage ≤ 5KB recommended. Auto-compacted.
- **Sessions:** Stored in `.singularity/sessions/`. Auto-pruned after 30 days.

---

*See [Getting Started](getting-started.md) for initial setup, [Deployment](deployment.md) for production.*
