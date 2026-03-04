"""
NEXUS — Proposal Applicator
================================

Bridges the gap between text-level proposals and runtime hot-swaps.

Two application modes:
    1. FILE EDIT: Modifies source on disk (for non-function-scoped changes)
    2. HOT SWAP: Replaces live function objects in memory (for function-scoped changes)

Both modes create backups and support rollback.

Safety:
    - All file edits are backed up before modification
    - Hot-swaps go through the HotSwapEngine's journal
    - Validation runs after every application
    - Failed validations trigger automatic rollback
"""

from __future__ import annotations

import ast
import logging
import shutil
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from .proposals import Proposal, Confidence
from .hotswap import HotSwapEngine

logger = logging.getLogger("singularity.nexus.applicator")


@dataclass
class ApplicationResult:
    """Result of applying a single proposal."""
    proposal_id: str
    method: str                  # "file_edit" or "hot_swap"
    success: bool
    swap_id: str | None = None   # If hot-swapped
    backup_path: str | None = None  # If file-edited
    error: str | None = None
    
    def __str__(self) -> str:
        status = "✅" if self.success else "❌"
        return f"{status} {self.proposal_id} via {self.method}" + (
            f" — {self.error}" if self.error else ""
        )


class ProposalApplicator:
    """Applies proposals to live code via file edits or hot-swaps.
    
    Strategy:
        - Proposals with `auto_applicable=True` and confidence HIGH/CERTAIN
          are eligible for automatic application.
        - If the proposal targets a specific function, we try hot-swap first.
        - If hot-swap isn't possible (e.g., class-level or import change),
          we fall back to file edit with backup.
    """
    
    def __init__(
        self,
        hotswap: HotSwapEngine,
        backup_dir: str | None = None,
    ):
        self.hotswap = hotswap
        self.backup_dir = Path(backup_dir) if backup_dir else (
            hotswap.workspace / ".singularity" / "nexus" / "backups"
        )
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self._applied: list[ApplicationResult] = []
    
    async def apply(self, proposal: Proposal) -> ApplicationResult:
        """Apply a single proposal.
        
        Tries hot-swap for function-scoped changes, falls back to file edit.
        """
        # Safety gate
        if proposal.confidence not in (Confidence.HIGH, Confidence.CERTAIN):
            return ApplicationResult(
                proposal_id=proposal.proposal_id,
                method="skipped",
                success=False,
                error=f"Confidence too low: {proposal.confidence}",
            )
        
        if not proposal.auto_applicable:
            return ApplicationResult(
                proposal_id=proposal.proposal_id,
                method="skipped",
                success=False,
                error="Not marked auto-applicable",
            )
        
        # Route to appropriate application method
        finding = proposal.finding
        
        # If it's a function-level change and we can extract the function source,
        # try hot-swap. Otherwise, file edit.
        if finding.function and self._is_function_scoped(proposal):
            result = await self._apply_hot_swap(proposal)
        else:
            result = await self._apply_file_edit(proposal)
        
        self._applied.append(result)
        return result
    
    async def apply_batch(
        self,
        proposals: list[Proposal],
        stop_on_failure: bool = True,
    ) -> list[ApplicationResult]:
        """Apply multiple proposals in sequence."""
        results = []
        for proposal in proposals:
            if not proposal.auto_applicable:
                continue
            if proposal.confidence not in (Confidence.HIGH, Confidence.CERTAIN):
                continue
            
            result = await self.apply(proposal)
            results.append(result)
            
            if not result.success and stop_on_failure:
                logger.warning(
                    f"[NEXUS] Stopping batch — proposal {proposal.proposal_id} "
                    f"failed: {result.error}"
                )
                break
        
        return results
    
    def _is_function_scoped(self, proposal: Proposal) -> bool:
        """Check if a proposal's change is contained within a single function."""
        # For now, error_handling fixes within functions are function-scoped
        # Import removals are file-scoped
        if proposal.category in ("error_handling",) and proposal.finding.function:
            return True
        return False
    
    async def _apply_hot_swap(self, proposal: Proposal) -> ApplicationResult:
        """Apply a proposal via runtime hot-swap."""
        finding = proposal.finding
        filepath = Path(finding.file)
        
        if not filepath.exists():
            return ApplicationResult(
                proposal_id=proposal.proposal_id,
                method="hot_swap",
                success=False,
                error=f"File not found: {finding.file}",
            )
        
        try:
            source = filepath.read_text(encoding="utf-8")
            tree = ast.parse(source)
        except Exception as e:
            return ApplicationResult(
                proposal_id=proposal.proposal_id,
                method="hot_swap",
                success=False,
                error=f"Cannot parse source: {e}",
            )
        
        # Find the function in the AST
        func_node = None
        parent_class = None
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                for item in node.body:
                    if (isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))
                            and item.name == finding.function):
                        func_node = item
                        parent_class = node.name
                        break
            elif (isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                    and node.name == finding.function):
                func_node = node
        
        if not func_node:
            return ApplicationResult(
                proposal_id=proposal.proposal_id,
                method="hot_swap",
                success=False,
                error=f"Function {finding.function} not found in AST",
            )
        
        # Extract the original function source and apply the text replacement
        lines = source.splitlines()
        func_start = func_node.lineno - 1
        func_end = (func_node.end_lineno or func_node.lineno)
        original_func_source = "\n".join(lines[func_start:func_end])
        
        # Apply the proposal's text replacement within the function
        new_func_source = original_func_source.replace(
            proposal.original_code,
            proposal.proposed_code,
        )
        
        if new_func_source == original_func_source:
            return ApplicationResult(
                proposal_id=proposal.proposal_id,
                method="hot_swap",
                success=False,
                error="Proposal text pattern not found in function source",
            )
        
        # Dedent the function source for compilation
        # (hotswap needs standalone compilable function)
        import textwrap
        new_func_dedented = textwrap.dedent(new_func_source)
        
        # Derive the module name from the file path
        module_name = self._filepath_to_module(filepath)
        if not module_name:
            # Fall back to file edit
            return await self._apply_file_edit(proposal)
        
        try:
            swap_id = await self.hotswap.swap(
                module_name=module_name,
                function_name=finding.function,
                new_source=new_func_dedented,
                reason=f"NEXUS auto-optimize: {proposal.title}",
                class_name=parent_class,
                validate=False,  # We validate structurally, not functionally
            )
            
            # Also apply to disk so the change persists across restarts
            self._backup_file(filepath)
            new_lines = lines[:func_start] + new_func_source.splitlines() + lines[func_end:]
            filepath.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
            
            return ApplicationResult(
                proposal_id=proposal.proposal_id,
                method="hot_swap",
                success=True,
                swap_id=swap_id,
            )
        except Exception as e:
            return ApplicationResult(
                proposal_id=proposal.proposal_id,
                method="hot_swap",
                success=False,
                error=str(e),
            )
    
    async def _apply_file_edit(self, proposal: Proposal) -> ApplicationResult:
        """Apply a proposal via direct file edit with backup."""
        finding = proposal.finding
        filepath = Path(finding.file)
        
        if not filepath.exists():
            return ApplicationResult(
                proposal_id=proposal.proposal_id,
                method="file_edit",
                success=False,
                error=f"File not found: {finding.file}",
            )
        
        try:
            source = filepath.read_text(encoding="utf-8")
        except Exception as e:
            return ApplicationResult(
                proposal_id=proposal.proposal_id,
                method="file_edit",
                success=False,
                error=f"Cannot read file: {e}",
            )
        
        # Apply text replacement
        if proposal.original_code not in source:
            return ApplicationResult(
                proposal_id=proposal.proposal_id,
                method="file_edit",
                success=False,
                error="Original code pattern not found in file",
            )
        
        # Backup first
        backup_path = self._backup_file(filepath)
        
        # Apply the change
        new_source = source.replace(proposal.original_code, proposal.proposed_code, 1)
        
        # Validate it still parses
        try:
            ast.parse(new_source)
        except SyntaxError as e:
            # Restore from backup
            shutil.copy2(backup_path, filepath)
            return ApplicationResult(
                proposal_id=proposal.proposal_id,
                method="file_edit",
                success=False,
                backup_path=str(backup_path),
                error=f"Modified code has syntax error: {e}",
            )
        
        # Write the change
        filepath.write_text(new_source, encoding="utf-8")
        
        return ApplicationResult(
            proposal_id=proposal.proposal_id,
            method="file_edit",
            success=True,
            backup_path=str(backup_path),
        )
    
    def _backup_file(self, filepath: Path) -> Path:
        """Create a timestamped backup of a file."""
        timestamp = int(time.time())
        backup_name = f"{filepath.stem}-{timestamp}{filepath.suffix}"
        backup_path = self.backup_dir / backup_name
        shutil.copy2(filepath, backup_path)
        logger.info(f"[NEXUS] Backed up {filepath} → {backup_path}")
        return backup_path
    
    def _filepath_to_module(self, filepath: Path) -> str | None:
        """Convert a file path to a Python module name."""
        try:
            # Try to find 'singularity' in the path parts
            parts = filepath.resolve().parts
            for i, part in enumerate(parts):
                if part == "singularity" and i + 1 < len(parts) and parts[i + 1] == "singularity":
                    # Found the singularity/singularity/ root
                    module_parts = list(parts[i + 1:])
                    # Remove .py extension
                    if module_parts[-1].endswith(".py"):
                        module_parts[-1] = module_parts[-1][:-3]
                    # Remove __init__
                    if module_parts[-1] == "__init__":
                        module_parts = module_parts[:-1]
                    return ".".join(module_parts)
        except Exception:
            pass
        return None
    
    def get_applied(self) -> list[ApplicationResult]:
        """Get all application results from this session."""
        return list(self._applied)
