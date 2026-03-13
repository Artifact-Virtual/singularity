# Contributing

> Development workflow, code standards, and how to contribute to Singularity.

## License

Singularity is licensed under **AGPL-3.0-or-later**. By contributing, you agree that your contributions will be licensed under the same terms.

---

## Development Setup

### Prerequisites

- Python 3.11+
- Git
- A Discord bot token (for testing Discord adapter)
- An LLM provider (Copilot proxy, Ollama, or HuggingFace)

### Setup

```bash
git clone https://github.com/Artifact-Virtual/singularity.git
cd singularity
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
# Edit .env with your credentials
```

### Running

```bash
# Run directly
python -m singularity

# Run tests
pytest tests/

# Type check
mypy singularity/
```

---

## Code Standards

### Style

- **Python 3.11+** — Use modern Python features (match statements, type hints, etc.)
- **asyncio** — All I/O operations must be async
- **Type hints** — Required on all function signatures
- **Docstrings** — Required on all public functions and classes
- **Line length** — 120 characters max
- **Imports** — stdlib → third-party → local, separated by blank lines

### Naming

- `snake_case` for functions and variables
- `PascalCase` for classes
- `UPPER_SNAKE_CASE` for constants
- Prefix private methods with `_`

### Error Handling

- **Never** swallow exceptions silently — always log
- Use typed exceptions, not bare `except:`
- Include context in error messages
- NEXUS actively detects and flags violations of these rules

### Logging

Every module must have a logger:

```python
import logging
logger = logging.getLogger(__name__)
```

Use appropriate levels:
- `logger.debug()` — Detailed diagnostic info
- `logger.info()` — Normal operation milestones
- `logger.warning()` — Unexpected but recoverable
- `logger.error()` — Failed operations
- `logger.critical()` — System-level failures

---

## Architecture Rules

### Subsystem Boundaries

Each subsystem lives in its own directory under `singularity/`:

```
singularity/
├── cortex/      # Agent brain, planner, engine
├── voice/       # LLM providers, chain
├── nerve/       # Discord adapter, HTTP API
├── memory/      # COMB, VDB, sessions
├── csuite/      # Executive delegation
├── nexus/       # Self-optimization
├── pulse/       # Scheduler
├── immune/      # Self-healing
├── sinew/       # Tool definitions and execution
├── atlas/       # Topology tracking
├── auditor/     # Release management, ops auditing
└── config/      # Configuration loading
```

### Rules

1. **No circular imports** — Subsystems depend downward, not sideways
2. **NEXUS cannot modify itself** — Self-optimization has a hard boundary
3. **Tools are defined in sinew/** — All tool definitions live in `sinew/definitions.py`
4. **Config is centralized** — All config reads go through `config/`
5. **Memory ops are async** — All COMB/VDB operations must be non-blocking

---

## PR Process

1. **Branch** from `main` — use descriptive branch names (`fix/prisma-v5-rollback`, `feat/vdb-native`)
2. **Write tests** — New features need test coverage
3. **Run NEXUS audit** — `nexus_audit` should pass clean on your changes
4. **Commit messages** — Use conventional commits:
   - `feat:` — New feature
   - `fix:` — Bug fix
   - `refactor:` — Code restructure (no behavior change)
   - `docs:` — Documentation only
   - `chore:` — Maintenance, deps, config
   - `security:` — Security fix
   - `license:` — License changes
5. **Push** and create a Pull Request
6. **Review** — CTO executive may be dispatched for automated code review

---

## NEXUS Integration

When contributing, be aware that NEXUS continuously scans the codebase:

### Safe Evolutions (Auto-Applied)

These patterns are auto-detected and auto-fixed:
- Silent exception swallowing → adds logging
- Bare `except:` → typed `except Exception:`
- Missing loggers → auto-injects `logger = logging.getLogger(__name__)`

### Your Code Will Be Improved

Don't be surprised if NEXUS evolves your code after merge. This is by design — the codebase improves continuously.

---

## Reporting Issues

- File issues on [GitHub Issues](https://github.com/Artifact-Virtual/singularity/issues)
- Security vulnerabilities → contact directly, do not file public issues
- Include: steps to reproduce, expected vs actual behavior, relevant logs

---

*Built by AVA. Designed by Ali. Licensed under AGPL-3.0-or-later.*
