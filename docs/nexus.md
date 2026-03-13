# Self-Optimization (NEXUS)

NEXUS is Singularity's self-optimization engine. It analyzes its own codebase, identifies anti-patterns, and applies safe fixes — either through hot-swap at runtime or disk persistence.

---

## Capabilities

### 1. Audit
Scan the codebase for quality issues using AST (Abstract Syntax Tree) analysis.

**What it detects:**
- Silent exception swallowing (`except: pass`)
- Bare except clauses (catching everything including SystemExit)
- Missing loggers in modules
- Overly complex functions (cyclomatic complexity)
- Dead code patterns
- Inconsistent error handling

```
nexus_audit(mode="audit")           # Scan only
nexus_audit(mode="propose")         # Scan + generate fix proposals
nexus_audit(mode="optimize")        # Scan + propose + auto-apply HIGH confidence
nexus_audit(mode="report")          # Full detailed report
nexus_audit(target="voice/")        # Scan specific subdirectory
```

### 2. Evolve
Automated evolution cycle — find safe mechanical transformations and apply them.

**Safe evolutions (auto-apply):**
- `except: pass` → `except Exception as e: logger.error(f"...: {e}")`
- `except:` → `except Exception:`
- Missing `import logging` + `logger = logging.getLogger(__name__)`

**Unsafe (require review):**
- Function rewrites
- Architecture changes
- Anything touching NEXUS itself (forbidden by design)

```
nexus_evolve(dry_run=True)          # Find but don't apply
nexus_evolve(dry_run=False)         # Find + apply
nexus_evolve(target="memory/")      # Evolve specific module
nexus_evolve(max_evolutions=10)     # Limit changes per run
```

### 3. Hot-Swap
Replace a live function at runtime without restarting the service.

```
nexus_swap(
    module_name="singularity.voice.huggingface",
    function_name="chat_stream",
    new_source="async def chat_stream(self, messages, **kwargs): ...",
    reason="Add error logging to silent exception"
)
```

Every swap is:
- Validated via AST parse before application
- Journaled with timestamp, reason, and original source
- Rollback-capable (`nexus_rollback(swap_id)` or `nexus_rollback("all")`)

### 4. Journal
Every NEXUS action is logged in an append-only journal:
- What was changed
- Why it was changed
- Original source (for rollback)
- AST validation result
- Timestamp

---

## Safety Rules

1. **NEXUS cannot modify NEXUS** — the engine never touches its own files
2. **AST validation required** — every change must parse cleanly before application
3. **Rollback always available** — no swap is permanent until confirmed
4. **Journal is append-only** — audit trail cannot be tampered with
5. **Evolution is conservative** — only mechanical, pattern-matching transformations

---

## Cadence

- `nexus_audit` runs at least weekly
- `nexus_evolve` runs when audit findings exist
- Hot-swaps are used for urgent runtime fixes between deployments

---

*Next: [Product Monitoring (POA) →](poa.md)*
