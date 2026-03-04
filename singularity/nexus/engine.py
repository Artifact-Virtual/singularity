"""
NEXUS — Self-Optimization Engine
====================================

The orchestrator that ties analysis → proposals → hot-swap → verify.

This is the main interface for Singularity's self-optimization capability.

Modes:
    - AUDIT: Scan code, report findings, generate proposals. No modifications.
    - PROPOSE: Audit + generate concrete improvement proposals with diffs.
    - OPTIMIZE: Propose + auto-apply HIGH confidence proposals via hot-swap.
    - REPORT: Generate a full optimization report for review.

Integration:
    - Boots as part of the Singularity runtime (phase 9 or standalone)
    - Emits bus events for all actions
    - Accessible via the `nexus_*` tool family
    - Results stored in .singularity/nexus/
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional, TYPE_CHECKING

from .analyzer import CodeAnalyzer, AnalysisReport, Finding, Severity
from .proposals import ProposalGenerator, Proposal, Confidence
from .hotswap import HotSwapEngine, SwapRecord
from .applicator import ProposalApplicator
from .evolve import EvolutionEngine, EvolutionReport

if TYPE_CHECKING:
    from ..bus import EventBus

logger = logging.getLogger("singularity.nexus.engine")


class OptimizationMode:
    AUDIT = "audit"
    PROPOSE = "propose"
    OPTIMIZE = "optimize"
    REPORT = "report"


@dataclass
class OptimizationResult:
    """Result of an optimization cycle."""
    mode: str
    timestamp: float
    duration_seconds: float
    report: AnalysisReport
    proposals: list[Proposal]
    swaps_attempted: int = 0
    swaps_succeeded: int = 0
    swaps_failed: int = 0
    swaps_rolled_back: int = 0
    errors: list[str] = field(default_factory=list)

    def summary(self) -> str:
        lines = [
            f"═══ NEXUS Optimization Report ═══",
            f"Mode: {self.mode.upper()}",
            f"Duration: {self.duration_seconds:.2f}s",
            f"",
            f"── Analysis ──",
            self.report.summary(),
            f"",
            f"── Proposals ──",
            f"Total: {len(self.proposals)}",
        ]
        
        if self.proposals:
            by_confidence = {}
            for p in self.proposals:
                by_confidence.setdefault(p.confidence, []).append(p)
            for conf in [Confidence.CERTAIN, Confidence.HIGH, Confidence.MEDIUM, Confidence.LOW]:
                if conf in by_confidence:
                    lines.append(f"  {conf.upper()}: {len(by_confidence[conf])}")
        
        if self.mode == OptimizationMode.OPTIMIZE:
            lines.extend([
                f"",
                f"── Hot-Swaps ──",
                f"Attempted: {self.swaps_attempted}",
                f"Succeeded: {self.swaps_succeeded}",
                f"Failed: {self.swaps_failed}",
                f"Rolled back: {self.swaps_rolled_back}",
            ])
        
        if self.errors:
            lines.extend([
                f"",
                f"── Errors ──",
                *[f"  • {e}" for e in self.errors],
            ])
        
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "mode": self.mode,
            "timestamp": self.timestamp,
            "duration_seconds": self.duration_seconds,
            "files_scanned": self.report.files_scanned,
            "total_functions": self.report.total_functions,
            "total_lines": self.report.total_lines,
            "findings_count": len(self.report.findings),
            "critical_findings": self.report.critical_count,
            "proposals_count": len(self.proposals),
            "swaps_attempted": self.swaps_attempted,
            "swaps_succeeded": self.swaps_succeeded,
            "errors": self.errors,
        }


class NexusEngine:
    """Self-optimization engine for the Singularity runtime.
    
    Usage:
        nexus = NexusEngine(
            source_root="/home/adam/workspace/singularity/singularity",
            workspace="/home/adam/workspace/singularity",
            bus=event_bus,
        )
        await nexus.start()
        
        # Full audit
        result = await nexus.run(mode="audit")
        print(result.summary())
        
        # Propose improvements
        result = await nexus.run(mode="propose")
        for proposal in result.proposals:
            print(proposal)
        
        # Auto-optimize (only HIGH+ confidence)
        result = await nexus.run(mode="optimize")
        
        # Rollback everything
        await nexus.rollback_all()
    """
    
    def __init__(
        self,
        source_root: str,
        workspace: str,
        bus: EventBus | None = None,
    ):
        self.source_root = Path(source_root)
        self.workspace = Path(workspace)
        self.bus = bus
        
        # Sub-engines
        self.analyzer = CodeAnalyzer(str(self.source_root))
        self.proposer = ProposalGenerator()
        self.hotswap = HotSwapEngine(
            workspace=str(self.workspace),
            bus=bus,
        )
        self.applicator = ProposalApplicator(
            hotswap=self.hotswap,
        )
        self.evolution = EvolutionEngine(
            source_root=str(self.source_root),
            hotswap=self.hotswap,
            bus=bus,
        )
        
        # State
        self._started = False
        self._run_count = 0
        self._results_dir = self.workspace / ".singularity" / "nexus" / "results"
    
    async def start(self) -> None:
        """Initialize the engine."""
        self._results_dir.mkdir(parents=True, exist_ok=True)
        self._started = True
        
        if self.bus:
            await self.bus.emit("nexus.engine.started", {
                "source_root": str(self.source_root),
            }, source="nexus")
        
        logger.info(f"[NEXUS] Engine started. Source root: {self.source_root}")
    
    async def run(
        self,
        mode: str = OptimizationMode.AUDIT,
        target: str | None = None,
        auto_apply: bool = False,
        dry_run: bool = False,
    ) -> OptimizationResult:
        """Run an optimization cycle.
        
        Args:
            mode: audit, propose, optimize, or report
            target: Specific file or subdirectory to scan (relative to source_root)
            auto_apply: If True and mode=optimize, apply HIGH+ proposals automatically
            dry_run: If True, don't actually swap — just show what would happen
            
        Returns:
            OptimizationResult with full details
        """
        if not self._started:
            await self.start()
        
        t0 = time.perf_counter()
        self._run_count += 1
        
        if self.bus:
            await self.bus.emit("nexus.cycle.started", {
                "mode": mode,
                "target": target,
                "run_number": self._run_count,
            }, source="nexus")
        
        # ── Phase 1: Analyze ──
        logger.info(f"[NEXUS] Phase 1: Analyzing {target or 'all'}...")
        report = self.analyzer.scan(target)
        logger.info(f"[NEXUS] Analysis complete: {report.summary()}")
        
        # ── Phase 2: Generate proposals ──
        proposals: list[Proposal] = []
        if mode in (OptimizationMode.PROPOSE, OptimizationMode.OPTIMIZE, OptimizationMode.REPORT):
            logger.info("[NEXUS] Phase 2: Generating proposals...")
            proposals = self.proposer.generate(report)
            logger.info(f"[NEXUS] Generated {len(proposals)} proposals")
        
        # ── Phase 3: Hot-swap (optimize mode only) ──
        swaps_attempted = 0
        swaps_succeeded = 0
        swaps_failed = 0
        swaps_rolled_back = 0
        errors: list[str] = []
        
        if mode == OptimizationMode.OPTIMIZE and (auto_apply or not dry_run):
            logger.info("[NEXUS] Phase 3: Applying proposals...")
            
            for proposal in proposals:
                if not proposal.auto_applicable:
                    continue
                if proposal.confidence not in (Confidence.HIGH, Confidence.CERTAIN):
                    continue
                
                swaps_attempted += 1
                
                if dry_run:
                    logger.info(f"[NEXUS] DRY RUN: Would apply {proposal.proposal_id}")
                    swaps_succeeded += 1
                    continue
                
                try:
                    app_result = await self.applicator.apply(proposal)
                    if app_result.success:
                        swaps_succeeded += 1
                        logger.info(
                            f"[NEXUS] Applied {proposal.proposal_id}: "
                            f"{proposal.title} via {app_result.method}"
                        )
                    else:
                        swaps_failed += 1
                        errors.append(
                            f"{proposal.proposal_id}: {app_result.error}"
                        )
                        logger.warning(
                            f"[NEXUS] Failed to apply {proposal.proposal_id}: "
                            f"{app_result.error}"
                        )
                except Exception as e:
                    swaps_failed += 1
                    errors.append(f"{proposal.proposal_id}: {e}")
                    logger.error(f"[NEXUS] Exception applying {proposal.proposal_id}: {e}")
        
        duration = time.perf_counter() - t0
        
        result = OptimizationResult(
            mode=mode,
            timestamp=time.time(),
            duration_seconds=duration,
            report=report,
            proposals=proposals,
            swaps_attempted=swaps_attempted,
            swaps_succeeded=swaps_succeeded,
            swaps_failed=swaps_failed,
            swaps_rolled_back=swaps_rolled_back,
            errors=errors,
        )
        
        # Save result
        self._save_result(result)
        
        if self.bus:
            await self.bus.emit("nexus.cycle.completed", result.to_dict(), source="nexus")
        
        return result
    
    async def evolve(
        self,
        target: str | None = None,
        dry_run: bool = False,
        max_evolutions: int = 50,
    ) -> EvolutionReport:
        """Run a self-evolution cycle.
        
        Scans for safe, mechanical code transformations,
        validates them, and applies them with hot-swap + disk persistence.
        
        Args:
            target: Specific file or subdirectory to evolve
            dry_run: If True, find and validate but don't apply
            max_evolutions: Maximum number of evolutions to apply
            
        Returns:
            EvolutionReport with full details
        """
        if not self._started:
            await self.start()
        
        return await self.evolution.evolve(
            target=target,
            dry_run=dry_run,
            max_evolutions=max_evolutions,
        )
    
    async def rollback_all(self) -> int:
        """Rollback all active hot-swaps."""
        count = await self.hotswap.rollback_all()
        if self.bus:
            await self.bus.emit("nexus.rollback.all", {
                "count": count,
            }, source="nexus")
        return count
    
    async def rollback(self, swap_id: str) -> bool:
        """Rollback a specific swap."""
        return await self.hotswap.rollback(swap_id)
    
    def get_active_swaps(self) -> list[SwapRecord]:
        """List active swaps."""
        return self.hotswap.get_active_swaps()
    
    def get_status(self) -> dict:
        """Current engine status."""
        return {
            "started": self._started,
            "run_count": self._run_count,
            "active_swaps": len(self.hotswap.get_active_swaps()),
            "journal_entries": len(self.hotswap.get_journal()),
            "source_root": str(self.source_root),
        }
    
    def _save_result(self, result: OptimizationResult) -> None:
        """Save optimization result to disk."""
        try:
            filepath = self._results_dir / f"run-{self._run_count:04d}.json"
            filepath.write_text(json.dumps(result.to_dict(), indent=2))
        except Exception as e:
            logger.error(f"[NEXUS] Failed to save result: {e}")
