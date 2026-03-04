"""
CSUITE — Self-Healing Engine
============================

When an executive fails (API error, iteration timeout, tool crash, provider down),
this module classifies the failure and applies an immediate fix.

Singularity's job is NOT production code — it's self-improvement. Every failure
is an opportunity to make the system better. This module encodes that principle.

Healing strategies:
    1. RETRY     — Transient error (rate limit, network blip). Retry with backoff.
    2. REROUTE   — Provider failure. Switch to fallback provider chain.
    3. PATCH     — Tool/code error. Analyze, generate fix, hot-apply.
    4. EXPAND    — Iteration cap hit. Expand budget for the task class.
    5. ESCALATE  — Unrecoverable. Alert bridge + write post-mortem.
"""

from __future__ import annotations

import asyncio
import importlib
import json
import logging
import re
import time
import traceback
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from ..bus import EventBus
    from .coordinator import Coordinator

logger = logging.getLogger("singularity.csuite.self_heal")


class HealStrategy(Enum):
    RETRY = "retry"
    REROUTE = "reroute"
    PATCH = "patch"
    EXPAND = "expand"
    ESCALATE = "escalate"


@dataclass
class FailureRecord:
    """A classified failure with healing metadata."""
    task_id: str
    role: str
    error: str
    strategy: HealStrategy
    classification: str
    timestamp: float = field(default_factory=time.time)
    retry_count: int = 0
    healed: bool = False
    heal_action: str = ""


# ── Error Classification Patterns ────────────────────────────────────────
# Each pattern maps error text → (strategy, classification label)

ERROR_PATTERNS: list[tuple[re.Pattern, HealStrategy, str]] = [
    # API / Provider errors
    (re.compile(r"rate.?limit|429|too many requests", re.I), HealStrategy.RETRY, "rate_limit"),
    (re.compile(r"timeout|timed?\s*out|deadline exceeded", re.I), HealStrategy.RETRY, "timeout"),
    (re.compile(r"connection\s*(refused|reset|error)|ECONNREFUSED|ECONNRESET", re.I), HealStrategy.RETRY, "connection_error"),
    (re.compile(r"502|503|504|bad gateway|service unavailable", re.I), HealStrategy.RETRY, "server_error"),
    (re.compile(r"DNS|NXDOMAIN|getaddrinfo|name resolution", re.I), HealStrategy.RETRY, "dns_error"),
    
    # Provider-level failures (need reroute, not just retry)
    (re.compile(r"API key|authentication|unauthorized|401|403|invalid.*key", re.I), HealStrategy.REROUTE, "auth_failure"),
    (re.compile(r"model.*not found|does not exist|deprecated model", re.I), HealStrategy.REROUTE, "model_unavailable"),
    (re.compile(r"quota|billing|payment|insufficient", re.I), HealStrategy.REROUTE, "quota_exhausted"),
    (re.compile(r"provider.*down|all providers failed|no.*available", re.I), HealStrategy.REROUTE, "provider_down"),

    # Iteration / budget exhaustion
    (re.compile(r"max.*iteration|iteration.*cap|timeout.*iteration", re.I), HealStrategy.EXPAND, "iteration_cap"),
    
    # Tool / code errors (can be patched)
    (re.compile(r"ImportError|ModuleNotFoundError|No module named", re.I), HealStrategy.PATCH, "import_error"),
    (re.compile(r"AttributeError|TypeError|KeyError|IndexError", re.I), HealStrategy.PATCH, "code_error"),
    (re.compile(r"NameError|UnboundLocalError", re.I), HealStrategy.PATCH, "code_error"),
    (re.compile(r"FileNotFoundError|PermissionError|IsADirectoryError", re.I), HealStrategy.PATCH, "filesystem_error"),
    (re.compile(r"JSONDecodeError|json\.loads|invalid JSON", re.I), HealStrategy.PATCH, "parse_error"),
    (re.compile(r"ZeroDivisionError|OverflowError|ValueError", re.I), HealStrategy.PATCH, "runtime_error"),
]


class SelfHealEngine:
    """
    Autonomous failure detection, classification, and healing.
    
    Wired into the event bus — listens for task failures and escalations,
    then applies the appropriate healing strategy without human intervention.
    """

    MAX_RETRIES = 3
    RETRY_BACKOFF = [2.0, 5.0, 15.0]  # seconds
    MAX_ITERATION_EXPANSION = 50       # max we'll expand to
    FAILURE_WINDOW = 300               # 5 min window for failure rate tracking
    CIRCUIT_BREAKER_THRESHOLD = 5      # failures in window → circuit open

    def __init__(self, coordinator: Coordinator, bus: EventBus, workspace: Path):
        self.coordinator = coordinator
        self.bus = bus
        self.workspace = workspace / "self-heal"
        self.workspace.mkdir(parents=True, exist_ok=True)

        # Track failures for circuit breaker
        self._failure_history: list[FailureRecord] = []
        self._circuit_open: dict[str, float] = {}  # role → open_until timestamp
        self._active_heals: set[str] = set()  # task_ids currently being healed

        # Stats
        self.stats = {
            "failures_classified": 0,
            "retries_attempted": 0,
            "retries_succeeded": 0,
            "reroutes_attempted": 0,
            "patches_applied": 0,
            "expansions_applied": 0,
            "escalations_sent": 0,
        }

    async def start(self):
        """Wire into event bus."""
        self.bus.subscribe("csuite.task.completed", self._on_task_completed)
        self.bus.subscribe("csuite.escalation", self._on_escalation)
        logger.info("🩺 Self-heal engine started")

    async def stop(self):
        """Clean shutdown."""
        logger.info(f"🩺 Self-heal engine stopped. Stats: {json.dumps(self.stats)}")

    # ── Event Handlers ───────────────────────────────────────────────────

    async def _on_task_completed(self, event):
        """Check every completed task — if it failed, try to heal."""
        data = event.data
        status = data.get("status", "")
        if status in ("complete",):
            return  # nothing to heal

        task_id = data.get("task_id", "?")
        if task_id in self._active_heals:
            return  # already healing this one (prevent loops)

        role = data.get("role", "unknown")
        error = data.get("error") or data.get("response", "") or f"status={status}"

        await self._handle_failure(task_id, role, error, data)

    async def _on_escalation(self, event):
        """Escalation events — another entry point for healing."""
        data = event.data
        task_id = data.get("task_id", "?")
        if task_id in self._active_heals:
            return

        role = data.get("role", "unknown")
        reason = data.get("reason", "unknown")
        description = data.get("description", "")

        await self._handle_failure(task_id, role, f"{reason}: {description}", data)

    # ── Core Healing Logic ───────────────────────────────────────────────

    async def _handle_failure(self, task_id: str, role: str, error: str, raw_data: dict):
        """Classify failure and apply healing strategy."""
        self._active_heals.add(task_id)

        try:
            # Classify
            record = self._classify(task_id, role, error)
            self._failure_history.append(record)
            self.stats["failures_classified"] += 1

            logger.warning(
                f"🩺 Failure classified: {role}/{record.classification} "
                f"→ strategy={record.strategy.value}"
            )

            # Check circuit breaker
            if self._is_circuit_open(role):
                logger.error(f"🩺 Circuit OPEN for {role} — skipping heal, escalating")
                await self._escalate(record, "Circuit breaker open — too many failures")
                return

            # Apply strategy
            if record.strategy == HealStrategy.RETRY:
                await self._heal_retry(record, raw_data)
            elif record.strategy == HealStrategy.REROUTE:
                await self._heal_reroute(record, raw_data)
            elif record.strategy == HealStrategy.EXPAND:
                await self._heal_expand(record, raw_data)
            elif record.strategy == HealStrategy.PATCH:
                await self._heal_patch(record, raw_data)
            else:
                await self._escalate(record, "No automatic healing available")

        except Exception as e:
            logger.error(f"🩺 Self-heal error for {task_id}: {e}")
            await self._escalate(
                FailureRecord(task_id=task_id, role=role, error=str(e),
                              strategy=HealStrategy.ESCALATE, classification="heal_error"),
                f"Self-heal itself failed: {e}"
            )
        finally:
            self._active_heals.discard(task_id)

    def _classify(self, task_id: str, role: str, error: str) -> FailureRecord:
        """Match error text against known patterns."""
        for pattern, strategy, classification in ERROR_PATTERNS:
            if pattern.search(error):
                return FailureRecord(
                    task_id=task_id, role=role, error=error,
                    strategy=strategy, classification=classification,
                )

        # Unknown error → escalate
        return FailureRecord(
            task_id=task_id, role=role, error=error,
            strategy=HealStrategy.ESCALATE, classification="unknown",
        )

    # ── Strategy: RETRY ──────────────────────────────────────────────────

    async def _heal_retry(self, record: FailureRecord, raw_data: dict):
        """Retry the failed task with exponential backoff."""
        # Count prior retries for this task's description
        description = raw_data.get("description", raw_data.get("task_description", ""))
        if not description:
            await self._escalate(record, "Cannot retry — no task description available")
            return

        if record.retry_count >= self.MAX_RETRIES:
            logger.warning(f"🩺 Max retries ({self.MAX_RETRIES}) reached for {record.role}")
            # Upgrade to reroute
            record.strategy = HealStrategy.REROUTE
            await self._heal_reroute(record, raw_data)
            return

        backoff = self.RETRY_BACKOFF[min(record.retry_count, len(self.RETRY_BACKOFF) - 1)]
        self.stats["retries_attempted"] += 1
        logger.info(f"🩺 Retrying {record.role} in {backoff}s (attempt {record.retry_count + 1}/{self.MAX_RETRIES})")

        await asyncio.sleep(backoff)

        # Re-dispatch to the same role
        try:
            from .executive import Task
            result = await self.coordinator.dispatch_to(
                record.role, description, priority="high"
            )
            if result and result.tasks and result.tasks[0].status.value == "complete":
                record.healed = True
                record.heal_action = f"retry_success_attempt_{record.retry_count + 1}"
                self.stats["retries_succeeded"] += 1
                logger.info(f"🩺 ✅ Retry succeeded for {record.role}")
                await self._log_heal(record)
            else:
                record.retry_count += 1
                await self._heal_retry(record, raw_data)  # recurse with incremented count
        except Exception as e:
            logger.error(f"🩺 Retry dispatch failed: {e}")
            record.retry_count += 1
            await self._heal_retry(record, raw_data)

    # ── Strategy: REROUTE ────────────────────────────────────────────────

    async def _heal_reroute(self, record: FailureRecord, raw_data: dict):
        """Switch to a different provider in the chain."""
        self.stats["reroutes_attempted"] += 1

        # Check if provider chain has fallbacks
        provider_chain = getattr(self.coordinator, '_provider_chain', None)
        if not provider_chain:
            # Try to get it from the executive
            exec_obj = self.coordinator.executives.get(record.role)
            if exec_obj:
                provider_chain = exec_obj.provider_chain

        if provider_chain and hasattr(provider_chain, 'providers') and len(provider_chain.providers) > 1:
            # Rotate the provider list — move failed one to end
            current = provider_chain.providers
            if len(current) > 1:
                rotated = current[1:] + [current[0]]
                provider_chain.providers = rotated
                record.healed = True
                record.heal_action = f"rerouted_provider_{rotated[0].__class__.__name__}"
                logger.info(f"🩺 ✅ Rerouted {record.role} to next provider")
                await self._log_heal(record)

                # Retry the task with new provider
                description = raw_data.get("description", "")
                if description:
                    result = await self.coordinator.dispatch_to(record.role, description, priority="high")
                    if result and result.tasks and result.tasks[0].status.value == "complete":
                        logger.info(f"🩺 ✅ Rerouted task succeeded")
                return

        # No fallback providers available
        await self._escalate(record, "No fallback providers available for reroute")

    # ── Strategy: EXPAND ─────────────────────────────────────────────────

    async def _heal_expand(self, record: FailureRecord, raw_data: dict):
        """Expand iteration budget for the executive that timed out."""
        self.stats["expansions_applied"] += 1

        exec_obj = self.coordinator.executives.get(record.role)
        if not exec_obj:
            await self._escalate(record, f"Executive {record.role} not found for expansion")
            return

        # Read current default max_iterations from the role config
        current_max = exec_obj.role.max_iterations if hasattr(exec_obj.role, 'max_iterations') else 25
        new_max = min(current_max + 10, self.MAX_ITERATION_EXPANSION)

        if new_max <= current_max:
            await self._escalate(record, f"Already at max iteration cap ({current_max})")
            return

        # Apply expansion
        if hasattr(exec_obj.role, 'max_iterations'):
            exec_obj.role.max_iterations = new_max

        record.healed = True
        record.heal_action = f"expanded_iterations_{current_max}→{new_max}"
        logger.info(f"🩺 ✅ Expanded {record.role} iterations: {current_max} → {new_max}")
        await self._log_heal(record)

        # Retry with expanded budget
        description = raw_data.get("description", "")
        if description:
            await self.coordinator.dispatch_to(record.role, description, priority="high")

    # ── Strategy: PATCH ──────────────────────────────────────────────────

    async def _heal_patch(self, record: FailureRecord, raw_data: dict):
        """
        Dispatch the error to Singularity's own cortex for analysis and code fix.
        This is the self-modification path — Singularity reads its own code,
        finds the bug, writes a fix, and applies it.
        """
        self.stats["patches_applied"] += 1

        error_detail = record.error
        classification = record.classification

        # Build a focused repair task for the CTO
        patch_task = (
            f"SELF-HEAL: A {record.role} executive hit a {classification} error:\n"
            f"```\n{error_detail[:1500]}\n```\n\n"
            f"Your job:\n"
            f"1. Read the relevant source file in the singularity codebase\n"
            f"2. Find the exact bug causing this error\n"
            f"3. Write the fix using the edit tool\n"
            f"4. Verify the fix doesn't break imports (read surrounding code)\n"
            f"5. Report what you changed and why\n\n"
            f"Singularity codebase root: /home/adam/workspace/singularity/singularity/\n"
            f"Focus on defensive coding — guard nulls, handle missing keys, validate types."
        )

        logger.info(f"🩺 Dispatching patch task to CTO for {classification}")

        try:
            result = await self.coordinator.dispatch_to("cto", patch_task, priority="critical")
            if result and result.tasks:
                task_result = result.tasks[0]
                if task_result.status.value == "complete" and task_result.files_modified:
                    record.healed = True
                    record.heal_action = f"patched:{','.join(task_result.files_modified[:3])}"
                    logger.info(f"🩺 ✅ CTO patched {len(task_result.files_modified)} file(s)")

                    # Hot-reload affected modules
                    for fpath in task_result.files_modified:
                        await self._hot_reload(fpath)

                    await self._log_heal(record)
                    return

            # CTO couldn't fix it
            await self._escalate(record, "CTO could not produce a working patch")

        except Exception as e:
            logger.error(f"🩺 Patch dispatch failed: {e}")
            await self._escalate(record, f"Patch dispatch error: {e}")

    async def _hot_reload(self, filepath: str):
        """Attempt to hot-reload a Python module after patching."""
        try:
            # Convert file path to module path
            # e.g., /home/.../singularity/singularity/csuite/executive.py → singularity.csuite.executive
            path = Path(filepath)
            if not path.suffix == '.py':
                return

            # Find the module name relative to singularity package
            parts = path.parts
            try:
                idx = parts.index('singularity')
                # Take from the SECOND 'singularity' (package, not workspace)
                sing_indices = [i for i, p in enumerate(parts) if p == 'singularity']
                if len(sing_indices) >= 2:
                    module_parts = parts[sing_indices[1]:]
                else:
                    module_parts = parts[sing_indices[0]:]
                
                module_name = '.'.join(module_parts).replace('.py', '')
            except ValueError:
                logger.debug(f"🩺 Cannot determine module for {filepath}")
                return

            import sys
            if module_name in sys.modules:
                importlib.reload(sys.modules[module_name])
                logger.info(f"🩺 ✅ Hot-reloaded: {module_name}")
            else:
                logger.debug(f"🩺 Module {module_name} not loaded — skip reload")

        except Exception as e:
            logger.warning(f"🩺 Hot-reload failed for {filepath}: {e}")

    # ── Strategy: ESCALATE ───────────────────────────────────────────────

    async def _escalate(self, record: FailureRecord, reason: str):
        """Last resort — alert #bridge and write post-mortem."""
        self.stats["escalations_sent"] += 1

        msg = (
            f"🚨 **Self-Heal Escalation**\n"
            f"**Role:** {record.role}\n"
            f"**Classification:** {record.classification}\n"
            f"**Strategy:** {record.strategy.value}\n"
            f"**Reason:** {reason}\n"
            f"**Error:** `{record.error[:300]}`"
        )

        logger.error(f"🩺 ESCALATION: {record.role}/{record.classification} — {reason}")

        await self.bus.emit("csuite.escalation.to_ava", {
            "from": f"self-heal ({record.role})",
            "reason": reason,
            "task_id": record.task_id,
            "description": record.error[:500],
            "timestamp": time.time(),
        })

        # Write post-mortem file
        await self._write_postmortem(record, reason)

    # ── Circuit Breaker ──────────────────────────────────────────────────

    def _is_circuit_open(self, role: str) -> bool:
        """Check if circuit breaker is tripped for this role."""
        # Check if manually opened
        if role in self._circuit_open:
            if time.time() < self._circuit_open[role]:
                return True
            else:
                del self._circuit_open[role]  # expired

        # Check failure rate in window
        now = time.time()
        recent = [
            f for f in self._failure_history
            if f.role == role and (now - f.timestamp) < self.FAILURE_WINDOW
        ]
        if len(recent) >= self.CIRCUIT_BREAKER_THRESHOLD:
            self._circuit_open[role] = now + 60  # open for 60s
            logger.error(f"🩺 Circuit breaker OPENED for {role} ({len(recent)} failures in {self.FAILURE_WINDOW}s)")
            return True

        return False

    # ── Logging & Persistence ────────────────────────────────────────────

    async def _log_heal(self, record: FailureRecord):
        """Log a successful heal."""
        log_entry = {
            "task_id": record.task_id,
            "role": record.role,
            "classification": record.classification,
            "strategy": record.strategy.value,
            "heal_action": record.heal_action,
            "timestamp": record.timestamp,
            "healed_at": time.time(),
        }

        log_path = self.workspace / "heal-log.jsonl"
        try:
            with open(log_path, "a") as f:
                f.write(json.dumps(log_entry) + "\n")
        except Exception as e:
            logger.error(f"Failed to write heal log: {e}")

        logger.info(f"🩺 Heal logged: {record.role}/{record.classification} → {record.heal_action}")

    async def _write_postmortem(self, record: FailureRecord, reason: str):
        """Write a post-mortem file for unresolved failures."""
        from datetime import datetime, timezone
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
        path = self.workspace / "postmortems" / f"{ts}-{record.role}-{record.classification}.md"
        path.parent.mkdir(parents=True, exist_ok=True)

        content = (
            f"# Post-Mortem: {record.role}/{record.classification}\n\n"
            f"**Time:** {ts}\n"
            f"**Task ID:** {record.task_id}\n"
            f"**Strategy attempted:** {record.strategy.value}\n"
            f"**Escalation reason:** {reason}\n\n"
            f"## Error\n```\n{record.error[:2000]}\n```\n\n"
            f"## Failure History (last 5)\n"
        )

        recent = [f for f in self._failure_history if f.role == record.role][-5:]
        for f in recent:
            content += f"- {f.classification}: {f.error[:100]} (healed={f.healed})\n"

        content += f"\n## Stats\n```json\n{json.dumps(self.stats, indent=2)}\n```\n"

        try:
            path.write_text(content)
            logger.info(f"🩺 Post-mortem written: {path}")
        except Exception as e:
            logger.error(f"Failed to write post-mortem: {e}")
