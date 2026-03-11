"""
SINEW — Sandbox & Safety
===========================

Path validation, command filtering, and safety enforcement.
Separated from executor for clarity and testability.

SECURITY HARDENING (Day 27):
- Credential leak prevention: blocks API keys/tokens in exec commands
- Self-modification guard: blocks writes to Singularity's own source
- Environment variable exfiltration blocking
"""

from __future__ import annotations

import logging
import os
import re
from pathlib import Path

logger = logging.getLogger("singularity.sinew.sandbox")

# ── Allowed path prefixes ──
ALLOWED_PATHS = [
    "/home/adam",
    "/tmp",
    "/var/log",
    "/etc",  # read-only access patterns
]

# ── Self-modification guard: Singularity CANNOT write to its own source ──
SELF_MODIFY_BLOCKED = [
    "/home/adam/workspace/singularity/singularity/",  # source code
    "/home/adam/workspace/singularity/config/",        # config files
]

# ── Blocked command patterns ──
BLOCKED_PATTERNS = [
    r"rm\s+-rf\s+/\s*$",           # rm -rf /
    r"rm\s+-rf\s+/\w",             # rm -rf /anything (root level)
    r"mkfs\b",                      # filesystem formatting
    r"dd\s+if=.*of=/dev",          # raw device writes
    r":\(\)\s*\{\s*:\|:&\s*\};:",  # fork bomb
    r"shutdown\b",                  # system shutdown
    r"reboot\b",                    # system reboot
    r"init\s+[06]",                # init shutdown/reboot
    r"chmod\s+.*777\s+/",          # chmod 777 on root paths
    r"chown\s+.*root",             # chown to root
    r"(?:^|sudo\s+)passwd\b",      # password changes (not /etc/passwd reads)
    r"userdel\b",                   # user deletion
]

# ── Credential patterns — detect API keys/tokens/secrets in commands ──
# These catch credentials being passed as literal values in exec commands
CREDENTIAL_PATTERNS = [
    # Generic API key patterns (hex strings of typical lengths)
    r'(?:API_KEY|api_key|apikey|API[-_]?SECRET|api[-_]?secret)\s*[=:]\s*["\']?[A-Za-z0-9_\-]{20,}',
    # Cloudflare — match CF_ prefix with any key/secret/token suffix
    r'(?:CF_KEY|CF_API|CF_SECRET|CF_TOKEN|CLOUDFLARE)["\']?\s*[=:]\s*["\']?[a-f0-9]{20,}',
    # Bearer tokens in curl headers (common pattern: -H "Authorization: Bearer xxx")
    r'Bearer\s+[A-Za-z0-9_\-\.]{20,}',
    # API key prefixed tokens (sk-, ghp_, hf_, etc.)
    r'\b(?:sk-[a-zA-Z0-9\-]{20,}|ghp_[a-zA-Z0-9]{20,}|hf_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,})',
    # AWS
    r'(?:AWS_SECRET|aws_secret)[A-Za-z_]*\s*[=:]\s*["\']?[A-Za-z0-9/+=]{20,}',
    # Generic secret/token/password assignment with substantial value
    r'(?:_TOKEN|_SECRET|_PASSWORD|_KEY)\s*[=:]\s*["\']?[A-Za-z0-9_\-]{20,}',
    # Known credential env vars being echoed/printed
    r'(?:echo|printf|cat)\s+.*(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)',
    # Env var dump commands
    r'\benv\b\s*$',                 # bare 'env' dumps all vars
    r'\bprintenv\b',                # printenv dumps env
    r'(?:echo|printf)\s+\$\{?(?:CLOUDFLARE|CF_|AWS_|ANTHROPIC|OPENAI|HF_|GITHUB_TOKEN|VERCEL)',
    # Direct .env reading commands
    r'(?:cat|less|more|head|tail|grep|bat|batcat)\s+[^\|]*\.env\b',
    r'source\s+.*\.env\b',
    # Hex strings that look like API keys (32+ hex chars assigned to a variable)
    r'[A-Z_]{3,}=["\'"]?[a-f0-9]{32,}',
]

_blocked_re = [re.compile(p, re.IGNORECASE) for p in BLOCKED_PATTERNS]
_credential_re = [re.compile(p, re.IGNORECASE) for p in CREDENTIAL_PATTERNS]


def validate_path(path: str, write: bool = False) -> str | None:
    """Validate a file path. Returns violation message or None if OK.
    
    Rules:
    - Must be under an allowed prefix
    - No path traversal (.. resolution checked against allowed paths)
    - No /proc, /sys, /dev writes
    - Cannot write to Singularity's own source code (self-modification guard)
    """
    try:
        resolved = str(Path(path).resolve())
    except Exception as e:
        return f"Invalid path: {e}"
    
    # Check allowed prefixes
    allowed = any(resolved.startswith(p) for p in ALLOWED_PATHS)
    if not allowed:
        return f"Path outside allowed directories: {resolved}"
    
    # Self-modification guard — block writes to own source
    if write:
        for blocked in SELF_MODIFY_BLOCKED:
            if resolved.startswith(blocked):
                logger.warning(
                    f"[SANDBOX] Self-modification BLOCKED: {resolved}"
                )
                return f"Self-modification blocked: cannot write to Singularity source ({resolved})"
    
    # Block sensitive paths even within allowed dirs
    _SENSITIVE_PARTS = (".ssh/", ".gnupg/", ".aws/", ".kube/", "id_rsa", "id_ed25519")
    for s in _SENSITIVE_PARTS:
        if s in resolved:
            return f"Sensitive path blocked: {resolved}"
    
    # Block .env file access entirely (credentials live here)
    if resolved.endswith(".env") or "/.env." in resolved:
        if write:
            return f"Cannot write to .env files: {resolved}"
        # Read is blocked too — use vault
        return f".env access blocked — use vault for credentials: {resolved}"
    
    return None


def validate_command(command: str) -> str | None:
    """Validate a shell command. Returns violation message or None if OK.
    
    Rules:
    - No destructive system commands
    - No fork bombs
    - No password/user manipulation
    - No credential leakage in commands (Day 27 hardening)
    """
    # Destructive command check
    for pattern in _blocked_re:
        if pattern.search(command):
            return f"Destructive command blocked: matches {pattern.pattern}"
    
    # Credential leak check
    for pattern in _credential_re:
        if pattern.search(command):
            logger.warning(
                f"[SANDBOX] Credential leak BLOCKED in exec command"
            )
            return (
                "Credential leak blocked: command contains API keys, tokens, or secrets. "
                "Use environment variables or vault — never pass credentials as literal values in commands."
            )
    
    # Block commands that read .env files
    if re.search(r'(?:cat|less|more|head|tail|grep|bat|source)\s+[^\|]*\.env\b', command, re.IGNORECASE):
        return "Blocked: .env file access via command. Use vault for credentials."
    
    return None
