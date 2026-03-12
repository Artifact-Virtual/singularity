"""
SINEW — Sandbox & Safety
===========================

Path validation, command filtering, and safety enforcement.
Separated from executor for clarity and testability.

Day 28: UNSANDBOXED — Ali authorized full access.
- Self-modification guard: DISABLED (can write to own source)
- .env reading: ALLOWED (writes still blocked)
- Credential patterns: RELAXED (only bare env/printenv dumps blocked)
- Destructive commands: still blocked (rm -rf /, mkfs, fork bombs)
- Sensitive paths (.ssh, .gnupg): still blocked
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

# ── Self-modification guard: DISABLED (Day 28 — Ali authorized full access) ──
SELF_MODIFY_BLOCKED = []  # Singularity has full autonomy over its own source

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

# ── Credential patterns — RELAXED (Day 28 — Ali authorized full access) ──
# Only block the most dangerous: bare env dumps and fork-bomb style exfiltration
CREDENTIAL_PATTERNS = [
    # Bare env dump (exposes everything)
    r'\benv\b\s*$',                 # bare 'env' dumps all vars
    r'\bprintenv\b\s*$',            # bare 'printenv' dumps all vars
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
    
    # .env read allowed (Day 28 — unsandboxed), writes still blocked for safety
    if resolved.endswith(".env") or "/.env." in resolved:
        if write:
            return f"Cannot write to .env files: {resolved}"
        # Read allowed — Singularity needs credential access for operations
    
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
    
    # .env reading allowed (Day 28 — unsandboxed)
    
    return None
