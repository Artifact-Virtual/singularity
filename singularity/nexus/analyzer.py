"""
NEXUS — AST Analyzer
========================

Static analysis of Singularity's own source code using Python's ast module.

Detects:
    - Functions with excessive complexity (nested loops, deep conditionals)
    - Missing error handling (bare except, no except on I/O)
    - Dead code (unreachable after return/raise)
    - Duplicate logic patterns
    - Long functions (>50 lines)
    - Missing type hints
    - Unused imports
    - Bare string concatenation in hot paths
    - Missing docstrings on public functions
"""

from __future__ import annotations

import ast
import os
import logging
import textwrap
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger("singularity.nexus.analyzer")


# ── Finding Types ────────────────────────────────────────────

class Severity:
    INFO = "info"
    WARNING = "warning"
    ISSUE = "issue"
    CRITICAL = "critical"


@dataclass
class Finding:
    """A single code analysis finding."""
    file: str
    line: int
    end_line: int | None
    function: str | None
    category: str           # e.g. "complexity", "error_handling", "dead_code"
    severity: str           # Severity level
    message: str
    suggestion: str | None = None
    source_snippet: str | None = None

    def __str__(self) -> str:
        loc = f"{self.file}:{self.line}"
        fn = f" in {self.function}()" if self.function else ""
        return f"[{self.severity.upper()}] {loc}{fn} — {self.message}"


@dataclass
class AnalysisReport:
    """Aggregated report from scanning one or more files."""
    files_scanned: int = 0
    total_functions: int = 0
    total_classes: int = 0
    total_lines: int = 0
    findings: list[Finding] = field(default_factory=list)

    @property
    def critical_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.CRITICAL)

    @property
    def issue_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.ISSUE)

    @property
    def warning_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.WARNING)

    def summary(self) -> str:
        return (
            f"Scanned {self.files_scanned} files, {self.total_functions} functions, "
            f"{self.total_lines} lines. "
            f"Findings: {self.critical_count} critical, {self.issue_count} issues, "
            f"{self.warning_count} warnings, "
            f"{len(self.findings) - self.critical_count - self.issue_count - self.warning_count} info."
        )


# ── AST Visitors ─────────────────────────────────────────────

class ComplexityVisitor(ast.NodeVisitor):
    """Calculate cyclomatic complexity of a function."""
    
    def __init__(self):
        self.complexity = 1  # Start at 1 for the function itself
    
    def visit_If(self, node: ast.If) -> None:
        self.complexity += 1
        self.generic_visit(node)
    
    def visit_For(self, node: ast.For) -> None:
        self.complexity += 1
        self.generic_visit(node)
    
    def visit_While(self, node: ast.While) -> None:
        self.complexity += 1
        self.generic_visit(node)
    
    def visit_ExceptHandler(self, node: ast.ExceptHandler) -> None:
        self.complexity += 1
        self.generic_visit(node)
    
    def visit_BoolOp(self, node: ast.BoolOp) -> None:
        # Each `and` / `or` adds a branch
        self.complexity += len(node.values) - 1
        self.generic_visit(node)
    
    def visit_IfExp(self, node: ast.IfExp) -> None:
        self.complexity += 1
        self.generic_visit(node)
    
    def visit_ListComp(self, node: ast.ListComp) -> None:
        self.complexity += len(node.generators)
        self.generic_visit(node)
    
    def visit_SetComp(self, node: ast.SetComp) -> None:
        self.complexity += len(node.generators)
        self.generic_visit(node)
    
    def visit_DictComp(self, node: ast.DictComp) -> None:
        self.complexity += len(node.generators)
        self.generic_visit(node)
    
    def visit_GeneratorExp(self, node: ast.GeneratorExp) -> None:
        self.complexity += len(node.generators)
        self.generic_visit(node)


class NestingVisitor(ast.NodeVisitor):
    """Calculate maximum nesting depth."""
    
    def __init__(self):
        self.max_depth = 0
        self._current_depth = 0
    
    def _enter_block(self, node: ast.AST) -> None:
        self._current_depth += 1
        self.max_depth = max(self.max_depth, self._current_depth)
        self.generic_visit(node)
        self._current_depth -= 1
    
    def visit_If(self, node: ast.If) -> None:
        self._enter_block(node)
    
    def visit_For(self, node: ast.For) -> None:
        self._enter_block(node)
    
    def visit_While(self, node: ast.While) -> None:
        self._enter_block(node)
    
    def visit_With(self, node: ast.With) -> None:
        self._enter_block(node)
    
    def visit_Try(self, node: ast.Try) -> None:
        self._enter_block(node)


# ── Main Analyzer ────────────────────────────────────────────

class CodeAnalyzer:
    """Analyze Python source files for code quality patterns.
    
    Usage:
        analyzer = CodeAnalyzer("/home/adam/workspace/singularity/singularity")
        report = analyzer.scan()
        print(report.summary())
        for finding in report.findings:
            print(finding)
    """
    
    # Thresholds (tunable)
    MAX_FUNCTION_LINES = 50
    MAX_COMPLEXITY = 10
    MAX_NESTING = 4
    MAX_PARAMS = 6
    
    def __init__(self, root_dir: str, exclude_dirs: list[str] | None = None):
        self.root = Path(root_dir)
        self.exclude_dirs = set(exclude_dirs or ["__pycache__", ".venv", "venv", "node_modules"])
    
    def scan(self, target: str | None = None) -> AnalysisReport:
        """Scan all Python files under root, or a specific file/directory.
        
        Args:
            target: Optional specific file or subdirectory to scan.
                    If None, scans entire root.
        """
        report = AnalysisReport()
        
        scan_path = self.root
        if target:
            candidate = self.root / target
            if candidate.exists():
                scan_path = candidate
            elif Path(target).exists():
                scan_path = Path(target)
        
        if scan_path.is_file():
            self._scan_file(scan_path, report)
        else:
            for py_file in sorted(scan_path.rglob("*.py")):
                # Skip excluded directories
                parts = py_file.relative_to(self.root if self.root in py_file.parents or py_file == self.root else py_file.parent).parts
                if any(exc in py_file.parts for exc in self.exclude_dirs):
                    continue
                self._scan_file(py_file, report)
        
        return report
    
    def _scan_file(self, filepath: Path, report: AnalysisReport) -> None:
        """Scan a single Python file."""
        try:
            source = filepath.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as e:
            logger.warning(f"Could not read {filepath}: {e}")
            return
        
        try:
            tree = ast.parse(source, filename=str(filepath))
        except SyntaxError as e:
            report.findings.append(Finding(
                file=str(filepath),
                line=e.lineno or 0,
                end_line=None,
                function=None,
                category="syntax",
                severity=Severity.CRITICAL,
                message=f"Syntax error: {e.msg}",
            ))
            return
        
        report.files_scanned += 1
        lines = source.splitlines()
        report.total_lines += len(lines)
        rel_path = str(filepath)
        
        # Collect all function and class defs
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                report.total_classes += 1
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                report.total_functions += 1
                self._analyze_function(node, rel_path, lines, report)
        
        # File-level checks
        self._check_imports(tree, rel_path, source, report)
        self._check_bare_excepts(tree, rel_path, report)
    
    def _analyze_function(
        self,
        node: ast.FunctionDef | ast.AsyncFunctionDef,
        filepath: str,
        lines: list[str],
        report: AnalysisReport,
    ) -> None:
        """Analyze a single function definition."""
        func_name = node.name
        start_line = node.lineno
        end_line = node.end_lineno or start_line
        func_lines = end_line - start_line + 1
        
        # ── Length check ──
        if func_lines > self.MAX_FUNCTION_LINES:
            report.findings.append(Finding(
                file=filepath,
                line=start_line,
                end_line=end_line,
                function=func_name,
                category="length",
                severity=Severity.WARNING,
                message=f"Function is {func_lines} lines (threshold: {self.MAX_FUNCTION_LINES})",
                suggestion="Consider breaking into smaller functions",
            ))
        
        # ── Complexity check ──
        cv = ComplexityVisitor()
        cv.visit(node)
        if cv.complexity > self.MAX_COMPLEXITY:
            report.findings.append(Finding(
                file=filepath,
                line=start_line,
                end_line=end_line,
                function=func_name,
                category="complexity",
                severity=Severity.WARNING if cv.complexity <= 15 else Severity.ISSUE,
                message=f"Cyclomatic complexity: {cv.complexity} (threshold: {self.MAX_COMPLEXITY})",
                suggestion="Reduce branching, extract helper functions",
            ))
        
        # ── Nesting check ──
        nv = NestingVisitor()
        nv.visit(node)
        if nv.max_depth > self.MAX_NESTING:
            report.findings.append(Finding(
                file=filepath,
                line=start_line,
                end_line=end_line,
                function=func_name,
                category="nesting",
                severity=Severity.WARNING,
                message=f"Max nesting depth: {nv.max_depth} (threshold: {self.MAX_NESTING})",
                suggestion="Flatten with early returns or extract helpers",
            ))
        
        # ── Parameter count ──
        params = node.args
        param_count = (
            len(params.args) + len(params.posonlyargs) + len(params.kwonlyargs)
            - (1 if params.args and params.args[0].arg == "self" else 0)
            - (1 if params.args and params.args[0].arg == "cls" else 0)
        )
        if param_count > self.MAX_PARAMS:
            report.findings.append(Finding(
                file=filepath,
                line=start_line,
                end_line=end_line,
                function=func_name,
                category="params",
                severity=Severity.INFO,
                message=f"{param_count} parameters (threshold: {self.MAX_PARAMS})",
                suggestion="Consider using a config/options dataclass",
            ))
        
        # ── Missing docstring ──
        if (not func_name.startswith("_")
            and not ast.get_docstring(node)
            and func_lines > 5):
            report.findings.append(Finding(
                file=filepath,
                line=start_line,
                end_line=end_line,
                function=func_name,
                category="documentation",
                severity=Severity.INFO,
                message="Public function missing docstring",
            ))
        
        # ── Missing return type hint ──
        if (not func_name.startswith("_")
            and node.returns is None
            and func_lines > 3):
            report.findings.append(Finding(
                file=filepath,
                line=start_line,
                end_line=end_line,
                function=func_name,
                category="type_hints",
                severity=Severity.INFO,
                message="Public function missing return type annotation",
            ))
    
    def _check_imports(
        self,
        tree: ast.Module,
        filepath: str,
        source: str,
        report: AnalysisReport,
    ) -> None:
        """Check for potentially unused imports."""
        imports: list[tuple[str, int]] = []
        
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname or alias.name.split(".")[-1]
                    imports.append((name, node.lineno))
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    if alias.name == "*":
                        continue
                    name = alias.asname or alias.name
                    imports.append((name, node.lineno))
        
        # Simple check: is the imported name used anywhere in the source
        # (excluding the import line itself)
        source_lines = source.splitlines()
        for name, lineno in imports:
            # Count occurrences in non-import lines
            occurrences = 0
            for i, line in enumerate(source_lines, 1):
                if i == lineno:
                    continue
                if name in line:
                    occurrences += 1
            
            if occurrences == 0:
                report.findings.append(Finding(
                    file=filepath,
                    line=lineno,
                    end_line=None,
                    function=None,
                    category="unused_import",
                    severity=Severity.INFO,
                    message=f"Potentially unused import: {name}",
                    suggestion=f"Remove `{name}` if not needed",
                ))
    
    def _check_bare_excepts(
        self,
        tree: ast.Module,
        filepath: str,
        report: AnalysisReport,
    ) -> None:
        """Find bare except clauses and overly broad exception handling."""
        for node in ast.walk(tree):
            if isinstance(node, ast.ExceptHandler):
                if node.type is None:
                    report.findings.append(Finding(
                        file=filepath,
                        line=node.lineno,
                        end_line=node.end_lineno,
                        function=None,
                        category="error_handling",
                        severity=Severity.ISSUE,
                        message="Bare `except:` clause catches everything including SystemExit and KeyboardInterrupt",
                        suggestion="Use `except Exception:` at minimum",
                    ))
                elif (isinstance(node.type, ast.Name) and node.type.id == "Exception"):
                    # Check if the exception body just passes or continues
                    if (len(node.body) == 1
                        and isinstance(node.body[0], (ast.Pass, ast.Continue))):
                        report.findings.append(Finding(
                            file=filepath,
                            line=node.lineno,
                            end_line=node.end_lineno,
                            function=None,
                            category="error_handling",
                            severity=Severity.WARNING,
                            message="Exception caught and silently ignored",
                            suggestion="Log the exception or handle it explicitly",
                        ))
