"""
CSUITE — Dispatch Interface
================================

Clean dispatch API that replaces the old executives/dispatch.py webhook system.

This module provides:
    - dispatch()      — send a task to the C-Suite (routes through Coordinator)
    - dispatch_all()  — fan-out to all executives
    - dispatch_to()   — target a specific executive
    - status()        — get C-Suite health snapshot
    - history()       — recent dispatch history
    - load_webhooks() — load webhook URLs from deployment files

All dispatches go through the Coordinator (Singularity).
No webhooks. No Discord. Native event bus.

Webhook URLs are persisted by the GuildDeployer for legacy/external
integrations that still need them.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, TYPE_CHECKING

from .roles import RoleType
from .coordinator import Coordinator, DispatchResult
from .executive import Task, TaskResult, TaskStatus

if TYPE_CHECKING:
    pass

logger = logging.getLogger("singularity.csuite.dispatch")


# ── Webhook URL Loader ────────────────────────────────────────────────

def load_webhooks(
    sg_dir: str | Path = "",
    guild_id: str = "",
) -> dict[str, str]:
    """
    Load webhook URLs from deployment result files.
    
    Args:
        sg_dir: Path to .singularity directory. If empty, uses default workspace.
        guild_id: Specific guild to load. If empty, loads first available.
    
    Returns:
        Dict of channel_name → webhook_url (e.g. {"cto": "https://discord.com/api/webhooks/..."})
    """
    if not sg_dir:
        sg_dir = Path.home() / "workspace" / "enterprise" / ".singularity"
    sg_dir = Path(sg_dir)
    deploy_dir = sg_dir / "deployments"
    
    if not deploy_dir.exists():
        logger.warning(f"No deployments directory at {deploy_dir}")
        return {}
    
    if guild_id:
        deploy_file = deploy_dir / f"{guild_id}.json"
        if not deploy_file.exists():
            logger.warning(f"No deployment file for guild {guild_id}")
            return {}
        files = [deploy_file]
    else:
        files = sorted(deploy_dir.glob("*.json"))
    
    webhooks: dict[str, str] = {}
    for f in files:
        try:
            data = json.loads(f.read_text())
            wh = data.get("webhooks", {})
            if wh:
                webhooks.update(wh)
                logger.info(f"Loaded {len(wh)} webhooks from {f.name}")
        except Exception as e:
            logger.error(f"Failed to load webhooks from {f}: {e}")
    
    return webhooks


def load_deployment(
    sg_dir: str | Path = "",
    guild_id: str = "",
) -> dict[str, Any]:
    """
    Load full deployment data (channels + webhooks) from deployment result files.
    
    Returns:
        Full deployment dict including channels, webhooks, guild info.
    """
    if not sg_dir:
        sg_dir = Path.home() / "workspace" / "enterprise" / ".singularity"
    sg_dir = Path(sg_dir)
    deploy_dir = sg_dir / "deployments"
    
    if not deploy_dir.exists():
        return {}
    
    if guild_id:
        deploy_file = deploy_dir / f"{guild_id}.json"
        if not deploy_file.exists():
            return {}
        files = [deploy_file]
    else:
        files = sorted(deploy_dir.glob("*.json"))
    
    for f in files:
        try:
            return json.loads(f.read_text())
        except Exception as e:
            logger.error(f"Failed to load deployment from {f}: {e}")
    
    return {}


class Dispatcher:
    """
    High-level dispatch interface.
    
    This is the public API that AVA (or any subsystem) uses to interact
    with the C-Suite. It wraps the Coordinator with convenience methods.
    
    Usage:
        dispatcher = Dispatcher(coordinator)
        
        # Auto-route by keywords
        result = await dispatcher.dispatch("Review GLADIUS architecture for bottlenecks")
        
        # Target specific executive
        result = await dispatcher.dispatch_to("cto", "Deploy COMB v0.3.0 to PyPI")
        
        # Fan-out to all
        result = await dispatcher.dispatch_all("Prepare Q1 status reports", priority="high")
    """

    def __init__(self, coordinator: Coordinator):
        self.coordinator = coordinator
        self._dispatch_log: list[dict[str, Any]] = []

    async def dispatch(
        self,
        description: str,
        priority: str = "normal",
        deadline: Optional[str] = None,
        context: Optional[dict[str, Any]] = None,
        max_iterations: int = 8,
    ) -> DispatchResult:
        """
        Dispatch a task with auto-routing.
        The Coordinator matches the task to the best executive(s) by keywords.
        """
        result = await self.coordinator.dispatch(
            description=description,
            target="auto",
            priority=priority,
            deadline=deadline,
            context=context,
            max_iterations=max_iterations,
            requester="ava",
        )
        self._log_dispatch("auto", description, priority, result)
        return result

    async def dispatch_to(
        self,
        target: str | RoleType,
        description: str,
        priority: str = "normal",
        deadline: Optional[str] = None,
        context: Optional[dict[str, Any]] = None,
        max_iterations: int = 8,
    ) -> DispatchResult:
        """Dispatch a task to a specific executive."""
        result = await self.coordinator.dispatch(
            description=description,
            target=target,
            priority=priority,
            deadline=deadline,
            context=context,
            max_iterations=max_iterations,
            requester="ava",
        )
        self._log_dispatch(str(target), description, priority, result)
        return result

    async def dispatch_all(
        self,
        description: str,
        priority: str = "normal",
        deadline: Optional[str] = None,
        context: Optional[dict[str, Any]] = None,
        max_iterations: int = 8,
    ) -> DispatchResult:
        """Dispatch a task to all executives in parallel."""
        result = await self.coordinator.dispatch(
            description=description,
            target="all",
            priority=priority,
            deadline=deadline,
            context=context,
            max_iterations=max_iterations,
            requester="ava",
        )
        self._log_dispatch("all", description, priority, result)
        return result

    async def dispatch_batch(
        self,
        tasks: list[tuple[str, str]],
        priority: str = "normal",
        deadline: Optional[str] = None,
        context: Optional[dict[str, Any]] = None,
        max_iterations: int = 8,
    ) -> DispatchResult:
        """
        Batch-dispatch multiple tasks, grouped by executive.
        
        Instead of spawning a separate LLM session per task, this groups
        tasks by their target executive and combines them into a single
        prompt per exec. Dramatically reduces API overhead for audits.
        
        Args:
            tasks: List of (target, description) tuples.
                   target can be "auto", "all", or a specific role name.
            priority: Priority for all tasks in the batch.
            deadline: Optional deadline string.
            context: Optional shared context dict.
            max_iterations: Max iterations per executive session.
        
        Returns:
            A single DispatchResult containing all task results.
        
        Example:
            await dispatcher.dispatch_batch([
                ("cto", "Review HEKTOR architecture"),
                ("cto", "Check CI pipeline status"),
                ("cfo", "Q1 revenue projection"),
                ("cfo", "Budget variance analysis"),
            ])
            # → 2 LLM sessions (1 CTO, 1 CFO) instead of 4
        """
        from collections import defaultdict
        
        # Group tasks by resolved target executive
        grouped: dict[str, list[str]] = defaultdict(list)
        
        for target, description in tasks:
            target_lower = target.lower().strip()
            if target_lower in ("auto", "all"):
                # For auto/all, resolve each task individually and group by result
                resolved = self.coordinator._resolve_targets(description, target_lower)
                for role_type in resolved:
                    grouped[role_type.value].append(description)
            else:
                grouped[target_lower].append(description)
        
        if not grouped:
            logger.warning("dispatch_batch: no tasks resolved to any executive")
            return DispatchResult(dispatch_id="batch-empty")
        
        # Build a combined prompt per executive and dispatch
        import uuid as _uuid
        batch_id = str(_uuid.uuid4())[:8]
        combined_result = DispatchResult(dispatch_id=f"batch-{batch_id}")
        
        # Run all executive batches in parallel
        async def _run_batched(role_name: str, descriptions: list[str]) -> Optional[TaskResult]:
            combined_desc = (
                f"**BATCH DISPATCH** — {len(descriptions)} task(s). "
                f"Complete each one and report results for all.\n\n"
            )
            for i, desc in enumerate(descriptions, 1):
                combined_desc += f"### Task {i}\n{desc}\n\n"
            
            try:
                result = await self.coordinator.dispatch(
                    description=combined_desc,
                    target=role_name,
                    priority=priority,
                    deadline=deadline,
                    context=context,
                    max_iterations=max_iterations,
                    requester="ava-batch",
                )
                return result.tasks[0] if result.tasks else None
            except Exception as e:
                logger.error(f"Batch dispatch to {role_name} failed: {e}")
                return TaskResult(
                    task_id=f"batch-{role_name}",
                    role=RoleType(role_name) if role_name in [r.value for r in RoleType] else RoleType.CTO,
                    status=TaskStatus.FAILED,
                    error=str(e),
                )
        
        from .executive import TaskResult, TaskStatus
        
        coros = [_run_batched(role, descs) for role, descs in grouped.items()]
        results = await asyncio.gather(*coros, return_exceptions=True)
        
        for r in results:
            if isinstance(r, Exception):
                logger.error(f"Batch task exception: {r}")
                combined_result.escalations.append({"error": str(r)})
            elif r is not None:
                combined_result.tasks.append(r)
        
        combined_result.completed_at = time.time()
        
        self._log_dispatch(
            f"batch({len(tasks)}→{len(grouped)} sessions)",
            f"Batch: {len(tasks)} tasks across {len(grouped)} executives",
            priority,
            combined_result,
        )
        
        logger.info(
            f"⚡ Batch dispatch complete: {len(tasks)} tasks → "
            f"{len(grouped)} exec sessions, {combined_result.duration:.1f}s"
        )
        
        return combined_result

    def status(self) -> dict[str, Any]:
        """Get full C-Suite status snapshot."""
        return self.coordinator.status_snapshot()

    def history(self, limit: int = 20) -> list[dict[str, Any]]:
        """Get recent dispatch history."""
        return self._dispatch_log[-limit:]

    def executive_status(self, role: str | RoleType) -> Optional[dict[str, Any]]:
        """Get status of a specific executive."""
        exec = self.coordinator.get_executive(role)
        if exec:
            return exec.status_snapshot()
        return None

    def _log_dispatch(
        self,
        target: str,
        description: str,
        priority: str,
        result: DispatchResult,
    ) -> None:
        """Log dispatch for history."""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "target": target,
            "description": description[:200],
            "priority": priority,
            "dispatch_id": result.dispatch_id,
            "tasks": len(result.tasks),
            "all_succeeded": result.all_succeeded,
            "duration": round(result.duration, 2),
        }
        self._dispatch_log.append(entry)
        logger.info(f"Dispatch logged: {target} → {result.dispatch_id} ({priority})")
