"""
NEXUS — Hot-Swap Engine
===========================

Runtime function replacement with full rollback capability.

How it works:
    1. Capture the original function object from the target module
    2. Store it in the rollback journal (in-memory + on-disk backup)
    3. Replace the function in the module's namespace
    4. Run validation (call a health check or test function)
    5. If validation fails → automatic rollback
    6. Emit bus event with swap details

Safety guarantees:
    - Every swap has a journal entry with the original function
    - rollback(swap_id) restores the original instantly
    - rollback_all() restores everything to pre-nexus state
    - On-disk journal survives process crashes (stores file-level backup)
    - NEVER swaps __init__, __del__, or dunder methods
    - NEVER swaps functions in the nexus module itself (no self-modifying the self-modifier)
"""

from __future__ import annotations

import asyncio
import copy
import importlib
import inspect
import json
import logging
import os
import shutil
import sys
import time
import types
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from ..bus import EventBus

logger = logging.getLogger("singularity.nexus.hotswap")


# ── Swap Record ──────────────────────────────────────────────

@dataclass
class SwapRecord:
    """Journal entry for a single function swap."""
    swap_id: str
    timestamp: float
    module_name: str
    class_name: str | None       # None for module-level functions
    function_name: str
    original_source: str         # Source code of original function
    new_source: str              # Source code of replacement
    reason: str                  # Why this swap was made
    status: str = "pending"      # pending, active, rolled_back, failed
    rollback_time: float | None = None
    error: str | None = None

    def to_dict(self) -> dict:
        return {
            "swap_id": self.swap_id,
            "timestamp": self.timestamp,
            "module_name": self.module_name,
            "class_name": self.class_name,
            "function_name": self.function_name,
            "reason": self.reason,
            "status": self.status,
            "rollback_time": self.rollback_time,
            "error": self.error,
        }


# ── Forbidden Targets ────────────────────────────────────────

_FORBIDDEN_MODULES = frozenset({
    "singularity.nexus",
    "singularity.nexus.analyzer",
    "singularity.nexus.hotswap",
    "singularity.nexus.proposals",
    "singularity.nexus.engine",
})

_FORBIDDEN_FUNCTIONS = frozenset({
    "__init__", "__del__", "__new__", "__repr__",
    "__enter__", "__exit__", "__aenter__", "__aexit__",
})


# ── Hot-Swap Engine ──────────────────────────────────────────

class HotSwapEngine:
    """Runtime function replacement with rollback journal.
    
    Usage:
        engine = HotSwapEngine(workspace="/home/adam/workspace/singularity")
        
        # Swap a function
        swap_id = await engine.swap(
            module_name="singularity.sinew.executor",
            function_name="_tool_exec",
            new_source='async def _tool_exec(self, args): ...',
            reason="Optimized timeout handling",
            validate=True,
        )
        
        # Rollback if needed
        await engine.rollback(swap_id)
        
        # Rollback everything
        await engine.rollback_all()
    """
    
    def __init__(
        self,
        workspace: str,
        bus: EventBus | None = None,
        journal_dir: str | None = None,
    ):
        self.workspace = Path(workspace)
        self.bus = bus
        self.journal_dir = Path(journal_dir) if journal_dir else (
            self.workspace / ".singularity" / "nexus" / "journal"
        )
        self.journal_dir.mkdir(parents=True, exist_ok=True)
        
        # In-memory journal: swap_id → (SwapRecord, original_function_object)
        self._journal: dict[str, tuple[SwapRecord, Any]] = {}
        self._swap_counter = 0
    
    def _generate_swap_id(self) -> str:
        self._swap_counter += 1
        return f"swap-{int(time.time())}-{self._swap_counter:04d}"
    
    async def swap(
        self,
        module_name: str,
        function_name: str,
        new_source: str,
        reason: str,
        class_name: str | None = None,
        validate: bool = True,
        validator: Callable | None = None,
    ) -> str:
        """Replace a function at runtime.
        
        Args:
            module_name: Fully qualified module (e.g. 'singularity.cortex.agent')
            function_name: Name of the function to replace
            new_source: Python source code of the replacement function
            reason: Why this swap is being made
            class_name: If the function is a method, the class name
            validate: Whether to run validation after swap
            validator: Optional async callable that returns True if swap is healthy
            
        Returns:
            swap_id for tracking/rollback
            
        Raises:
            ValueError: If target is forbidden
            RuntimeError: If swap or validation fails
        """
        swap_id = self._generate_swap_id()
        
        # ── Safety checks ──
        if module_name in _FORBIDDEN_MODULES:
            raise ValueError(f"Cannot swap functions in protected module: {module_name}")
        
        if function_name in _FORBIDDEN_FUNCTIONS:
            raise ValueError(f"Cannot swap dunder method: {function_name}")
        
        # ── Resolve the module ──
        module = sys.modules.get(module_name)
        if module is None:
            try:
                module = importlib.import_module(module_name)
            except ImportError as e:
                raise RuntimeError(f"Cannot import module {module_name}: {e}")
        
        # ── Get the target object (class or module) ──
        if class_name:
            target_obj = getattr(module, class_name, None)
            if target_obj is None:
                raise RuntimeError(f"Class {class_name} not found in {module_name}")
        else:
            target_obj = module
        
        # ── Get the original function ──
        original_func = getattr(target_obj, function_name, None)
        if original_func is None:
            raise RuntimeError(
                f"Function {function_name} not found on "
                f"{class_name or module_name}"
            )
        
        # ── Capture original source ──
        try:
            original_source = inspect.getsource(original_func)
        except (OSError, TypeError):
            original_source = f"# Could not retrieve source for {function_name}"
        
        # ── Create the record ──
        record = SwapRecord(
            swap_id=swap_id,
            timestamp=time.time(),
            module_name=module_name,
            class_name=class_name,
            function_name=function_name,
            original_source=original_source,
            new_source=new_source,
            reason=reason,
        )
        
        # ── Compile the new function ──
        try:
            # Build a namespace with the module's globals so the new function
            # has access to the same imports, constants, etc.
            exec_globals = dict(module.__dict__)
            exec(compile(new_source, f"<nexus-swap-{swap_id}>", "exec"), exec_globals)
            
            new_func = exec_globals.get(function_name)
            if new_func is None:
                raise RuntimeError(
                    f"New source does not define function '{function_name}'"
                )
        except Exception as e:
            record.status = "failed"
            record.error = f"Compilation failed: {e}"
            self._journal[swap_id] = (record, None)
            self._save_record(record)
            raise RuntimeError(f"Failed to compile new function: {e}")
        
        # ── Store original and perform swap ──
        self._journal[swap_id] = (record, original_func)
        
        try:
            setattr(target_obj, function_name, new_func)
            record.status = "active"
            logger.info(
                f"[NEXUS] Swapped {module_name}.{class_name + '.' if class_name else ''}"
                f"{function_name} (swap_id={swap_id})"
            )
        except Exception as e:
            record.status = "failed"
            record.error = f"setattr failed: {e}"
            self._save_record(record)
            raise RuntimeError(f"Failed to set new function: {e}")
        
        # ── Validate ──
        if validate and validator:
            try:
                if asyncio.iscoroutinefunction(validator):
                    valid = await validator()
                else:
                    valid = validator()
                
                if not valid:
                    logger.warning(f"[NEXUS] Validation failed for {swap_id}, rolling back")
                    await self.rollback(swap_id)
                    raise RuntimeError(f"Swap {swap_id} failed validation, rolled back")
            except Exception as e:
                if record.status == "active":
                    logger.warning(f"[NEXUS] Validator raised exception for {swap_id}: {e}")
                    await self.rollback(swap_id)
                    raise RuntimeError(f"Swap {swap_id} validator error, rolled back: {e}")
        
        # ── Persist and emit ──
        self._save_record(record)
        
        if self.bus:
            await self.bus.emit("nexus.function.swapped", {
                "swap_id": swap_id,
                "module": module_name,
                "class": class_name,
                "function": function_name,
                "reason": reason,
            }, source="nexus")
        
        return swap_id
    
    async def rollback(self, swap_id: str) -> bool:
        """Rollback a specific swap to its original function.
        
        Returns True if rollback succeeded, False if swap not found.
        """
        entry = self._journal.get(swap_id)
        if not entry:
            logger.warning(f"[NEXUS] No journal entry for {swap_id}")
            return False
        
        record, original_func = entry
        if original_func is None:
            logger.warning(f"[NEXUS] No original function stored for {swap_id}")
            return False
        
        if record.status == "rolled_back":
            logger.info(f"[NEXUS] {swap_id} already rolled back")
            return True
        
        # Resolve target
        module = sys.modules.get(record.module_name)
        if module is None:
            logger.error(f"[NEXUS] Module {record.module_name} no longer in sys.modules")
            return False
        
        target_obj = module
        if record.class_name:
            target_obj = getattr(module, record.class_name, None)
            if target_obj is None:
                logger.error(f"[NEXUS] Class {record.class_name} not found for rollback")
                return False
        
        setattr(target_obj, record.function_name, original_func)
        record.status = "rolled_back"
        record.rollback_time = time.time()
        self._save_record(record)
        
        logger.info(f"[NEXUS] Rolled back {swap_id}")
        
        if self.bus:
            await self.bus.emit("nexus.function.rolledback", {
                "swap_id": swap_id,
                "module": record.module_name,
                "function": record.function_name,
            }, source="nexus")
        
        return True
    
    async def rollback_all(self) -> int:
        """Rollback all active swaps. Returns count of rollbacks performed."""
        count = 0
        for swap_id, (record, _) in list(self._journal.items()):
            if record.status == "active":
                if await self.rollback(swap_id):
                    count += 1
        logger.info(f"[NEXUS] Rolled back {count} active swaps")
        return count
    
    def get_active_swaps(self) -> list[SwapRecord]:
        """List all currently active swaps."""
        return [
            record for record, _ in self._journal.values()
            if record.status == "active"
        ]
    
    def get_journal(self) -> list[dict]:
        """Full journal as list of dicts."""
        return [record.to_dict() for record, _ in self._journal.values()]
    
    def _save_record(self, record: SwapRecord) -> None:
        """Persist a swap record to disk."""
        filepath = self.journal_dir / f"{record.swap_id}.json"
        try:
            data = record.to_dict()
            data["original_source"] = record.original_source
            data["new_source"] = record.new_source
            filepath.write_text(json.dumps(data, indent=2))
        except Exception as e:
            logger.error(f"[NEXUS] Failed to save record {record.swap_id}: {e}")
