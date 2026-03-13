# Getting Started

This guide walks you through installing, configuring, and booting Singularity for the first time.

---

## Prerequisites

- **Python 3.11+** (3.13 recommended)
- **Linux** (Ubuntu 22.04+ or Debian 12+)
- **systemd** (for service management)
- **Git** (for version control)
- **Discord Bot Token** (for Discord integration)
- **Copilot Proxy** or **Ollama** (for LLM provider)

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Artifact-Virtual/singularity.git
cd singularity
```

### 2. Create Virtual Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Discord
DISCORD_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id

# LLM Provider
COPILOT_URL=http://localhost:3000/v1
PRIMARY_MODEL=gpt-4

# Database (for ERP integration)
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Optional: HuggingFace fallback
HF_TOKEN=hf_your_token_here

# Optional: Ollama fallback
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

### 4. First Boot

```bash
python -m singularity
```

Or with the CLI:

```bash
singularity setup    # Interactive setup wizard
singularity boot     # Start the runtime
singularity status   # Check subsystem health
```

---

## systemd Service

For production deployment, create a systemd user service:

```bash
mkdir -p ~/.config/systemd/user/

cat > ~/.config/systemd/user/singularity.service << EOF
[Unit]
Description=Singularity Autonomous Enterprise Runtime
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/path/to/singularity
ExecStart=/path/to/singularity/.venv/bin/python -m singularity
Restart=always
RestartSec=10
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable singularity
systemctl --user start singularity
```

---

## Verify Installation

After boot, verify all subsystems are operational:

```bash
# Check service status
systemctl --user status singularity

# Check HTTP API
curl http://localhost:8450/health

# Check logs
journalctl --user -u singularity -f
```

Expected health response:

```json
{
  "status": "ok",
  "runtime": "singularity",
  "uptime": 42.5,
  "subsystems": {
    "cortex": "ok",
    "voice": "ok",
    "memory": "ok",
    "nerve": "ok",
    "pulse": "ok",
    "immune": "ok"
  }
}
```

---

## Directory Structure

```
singularity/
├── singularity/          # Source code
│   ├── cortex/           # Agent loop, planner
│   ├── sinew/            # Tool definitions, executor
│   ├── voice/            # LLM providers
│   ├── memory/           # COMB, VDB, sessions
│   ├── csuite/           # Executive delegation
│   ├── nexus/            # Self-optimization
│   ├── pulse/            # Scheduler
│   ├── poa/              # Product monitoring
│   ├── immune/           # Self-healing
│   ├── nerve/            # Discord, HTTP API
│   ├── atlas/            # Topology
│   ├── auditor/          # Releases, auditing
│   └── cli/              # Command-line tools
├── docs/                 # Documentation (you are here)
├── tests/                # Test suite
├── executives/           # C-Suite agent data
├── .singularity/         # Runtime config, deployments
├── .env                  # Environment config (not tracked)
├── .env.example          # Example config (tracked)
├── pyproject.toml        # Package metadata
└── LICENSE               # AGPL-3.0-or-later
```

---

## Next Steps

- [Architecture](architecture.md) — understand the subsystem design
- [Configuration](configuration.md) — tune runtime behavior
- [Tools Reference](tools-reference.md) — explore all 28 tools
- [Deployment](deployment.md) — production deployment checklist

---

*Next: [Architecture →](architecture.md)*
