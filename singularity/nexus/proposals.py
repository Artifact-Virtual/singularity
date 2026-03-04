"""
NEXUS — Improvement Proposals
=================================

Generates concrete, actionable code improvement proposals
from analyzer findings.

Each proposal includes:
    - The finding it addresses
    - The original code
    - The proposed replacement
    - Expected impact (performance, readability, safety)
    - Confidence level (how safe is this auto-fix)

Only HIGH confidence proposals are eligible for auto-swap.
Everything else is surfaced for human review.
"""

from __future__ import annotations

import ast
import logging
import textwrap
from dataclasses import dataclass, field
from typing import Any

from .analyzer import Finding, Severity, AnalysisReport

logger = logging.getLogger("singularity.nexus.proposals")


class Confidence:
    """How confident we are this proposal is safe to auto-apply."""
    LOW = "low"           # Needs human review
    MEDIUM = "medium"     # Probably safe, but verify
    HIGH = "high"         # Safe to auto-apply
    CERTAIN = "certain"   # Mechanical transformation, zero risk


@dataclass
class Proposal:
    """A concrete code improvement proposal."""
    proposal_id: str
    finding: Finding
    category: str                # e.g. "error_handling", "performance", "cleanup"
    title: str
    description: str
    original_code: str
    proposed_code: str
    confidence: str              # Confidence level
    impact: str                  # Expected benefit
    auto_applicable: bool        # Can this be auto-swapped?
    
    def __str__(self) -> str:
        return (
            f"[{self.confidence.upper()}] {self.title}\n"
            f"  File: {self.finding.file}:{self.finding.line}\n"
            f"  Impact: {self.impact}\n"
            f"  Auto-apply: {'yes' if self.auto_applicable else 'no'}"
        )


class ProposalGenerator:
    """Generate improvement proposals from analysis findings.
    
    This is the conservative proposal engine. It generates SAFE
    transformations — things like:
    - Adding missing error handling
    - Replacing bare except with specific exceptions
    - Adding type hints to obvious cases
    - Extracting repeated patterns
    
    It does NOT:
    - Rewrite business logic
    - Change function signatures that have callers
    - Modify anything in the nexus module itself
    """
    
    def __init__(self):
        self._counter = 0
    
    def _next_id(self) -> str:
        self._counter += 1
        return f"proposal-{self._counter:04d}"
    
    def generate(self, report: AnalysisReport) -> list[Proposal]:
        """Generate proposals from an analysis report.
        
        Only generates proposals for findings where we have
        a concrete, safe transformation.
        """
        proposals: list[Proposal] = []
        
        for finding in report.findings:
            proposal = self._generate_for_finding(finding)
            if proposal:
                proposals.append(proposal)
        
        return proposals
    
    def _generate_for_finding(self, finding: Finding) -> Proposal | None:
        """Generate a proposal for a single finding, if possible."""
        generators = {
            "error_handling": self._propose_error_handling_fix,
            "unused_import": self._propose_remove_unused_import,
            "documentation": self._propose_add_docstring,
            "complexity": self._propose_complexity_reduction,
            "length": self._propose_length_reduction,
            "nesting": self._propose_nesting_reduction,
        }
        
        gen = generators.get(finding.category)
        if gen:
            return gen(finding)
        return None
    
    def _propose_error_handling_fix(self, finding: Finding) -> Proposal | None:
        """Propose fixing bare except clauses."""
        if "Bare `except:`" in finding.message:
            return Proposal(
                proposal_id=self._next_id(),
                finding=finding,
                category="error_handling",
                title="Replace bare except with Exception",
                description=(
                    "Bare `except:` catches SystemExit and KeyboardInterrupt, "
                    "which prevents clean shutdown. Replace with `except Exception:`."
                ),
                original_code="except:",
                proposed_code="except Exception:",
                confidence=Confidence.HIGH,
                impact="Prevents swallowing critical system signals",
                auto_applicable=True,
            )
        
        if "silently ignored" in finding.message:
            return Proposal(
                proposal_id=self._next_id(),
                finding=finding,
                category="error_handling",
                title="Log silently caught exception",
                description="Exception is caught but ignored. Add logging.",
                original_code="except Exception:\n    pass",
                proposed_code=(
                    "except Exception as e:\n"
                    "    logger.warning(f\"Suppressed exception: {e}\")"
                ),
                confidence=Confidence.MEDIUM,
                impact="Makes hidden failures visible in logs",
                auto_applicable=False,  # Needs review — might be intentional
            )
        
        return None
    
    def _propose_remove_unused_import(self, finding: Finding) -> Proposal | None:
        """Propose removing unused imports."""
        if "Potentially unused import" not in finding.message:
            return None
        
        # Extract the import name from the message
        import_name = finding.message.split(": ")[-1] if ": " in finding.message else None
        if not import_name:
            return None
        
        return Proposal(
            proposal_id=self._next_id(),
            finding=finding,
            category="cleanup",
            title=f"Remove unused import: {import_name}",
            description=f"Import `{import_name}` appears to be unused in this file.",
            original_code=f"import {import_name}  # or from ... import {import_name}",
            proposed_code="# (removed)",
            confidence=Confidence.MEDIUM,  # Could be used in eval/exec or TYPE_CHECKING
            impact="Cleaner imports, faster module loading",
            auto_applicable=False,  # Import analysis has false positives
        )
    
    def _propose_add_docstring(self, finding: Finding) -> Proposal | None:
        """Propose adding a docstring stub."""
        if "missing docstring" not in finding.message:
            return None
        
        func_name = finding.function
        if not func_name:
            return None
        
        return Proposal(
            proposal_id=self._next_id(),
            finding=finding,
            category="documentation",
            title=f"Add docstring to {func_name}()",
            description=f"Public function `{func_name}` lacks documentation.",
            original_code=f"def {func_name}(...):",
            proposed_code=f'def {func_name}(...):\n    """TODO: Document {func_name}."""',
            confidence=Confidence.LOW,  # Auto-generated docstring is placeholder
            impact="Better code documentation and IDE support",
            auto_applicable=False,
        )
    
    def _propose_complexity_reduction(self, finding: Finding) -> Proposal | None:
        """Flag high-complexity functions for refactoring."""
        if "Cyclomatic complexity" not in finding.message:
            return None
        
        return Proposal(
            proposal_id=self._next_id(),
            finding=finding,
            category="complexity",
            title=f"Reduce complexity in {finding.function}()",
            description=(
                f"{finding.message}. Consider extracting conditional branches "
                f"into helper methods, using early returns, or simplifying logic."
            ),
            original_code="# (complex function — see source)",
            proposed_code="# (needs manual refactoring)",
            confidence=Confidence.LOW,
            impact="Improved maintainability and testability",
            auto_applicable=False,  # Complexity reduction requires understanding intent
        )
    
    def _propose_length_reduction(self, finding: Finding) -> Proposal | None:
        """Flag long functions for splitting."""
        if "lines (threshold" not in finding.message:
            return None
        
        return Proposal(
            proposal_id=self._next_id(),
            finding=finding,
            category="length",
            title=f"Split long function {finding.function}()",
            description=(
                f"{finding.message}. Long functions are harder to test "
                f"and reason about. Extract logical sections into helpers."
            ),
            original_code="# (long function — see source)",
            proposed_code="# (needs manual refactoring)",
            confidence=Confidence.LOW,
            impact="Improved readability and testability",
            auto_applicable=False,
        )
    
    def _propose_nesting_reduction(self, finding: Finding) -> Proposal | None:
        """Flag deeply nested functions."""
        if "nesting depth" not in finding.message:
            return None
        
        return Proposal(
            proposal_id=self._next_id(),
            finding=finding,
            category="nesting",
            title=f"Flatten nesting in {finding.function}()",
            description=(
                f"{finding.message}. Use early returns (guard clauses) "
                f"to reduce indentation depth."
            ),
            original_code="# (deeply nested — see source)",
            proposed_code="# (apply guard clause pattern)",
            confidence=Confidence.LOW,
            impact="Improved readability — less cognitive load",
            auto_applicable=False,
        )
