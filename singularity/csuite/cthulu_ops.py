"""
CthulhOps — Dedicated Cthulu Trading Operations Agent
======================================================

Autonomous monitoring, journaling, and alerting for the Cthulu
trading system. Runs as scheduled PULSE jobs inside Singularity.

Responsibilities:
- Bridge health monitoring (every 5 min)
- Position tracking + P&L journaling (every 15 min)
- Trade rationale logging (when new trades detected)
- Daily summary generation (10 PM PKT / 17:00 UTC)
- Alert escalation to Ali (on critical events)
- Self-healing: restart bridge/webhook if down

NOT responsible for:
- Code changes to Cthulu
- Strategy modifications
- K9 brain configuration
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import subprocess
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Optional

import aiohttp

logger = logging.getLogger("singularity.csuite.cthulu_ops")

# ── Constants ────────────────────────────────────────────────────────

WEBHOOK_BASE = "http://127.0.0.1:9002"
COPILOT_URL = "http://127.0.0.1:3000/v1/chat/completions"
PKT = timezone(timedelta(hours=5))  # Asia/Karachi

# Discord webhook for alerts (heartbeat-monitor style)
DISCORD_WEBHOOK = (
    "https://discord.com/api/webhooks/1460675818245066833/"
    "RFpqNaTJfPm_76xUhvGBWbg-QQglsEm9shyLEFSd8417FlGwzQ96KekksixqAefFrG_d"
)
ALI_MENTION = "<@193011943382974466>"

# Discord channels
CHANNEL_AVA = "1475929150488449138"
CHANNEL_HEARTBEAT = "1478862319785349292"
CHANNEL_JOURNAL = "1480654393610211470"  # Thread "Daily Trading Log" in #journal forum

# Journal prompt — reads previous entry + changes → writes trader's notebook
JOURNAL_SYSTEM_PROMPT = (
    "You are CthulhOps, the trading journal for an autonomous K9 trading brain. "
    "Write like a seasoned trader's notebook — concise, specific, opinionated. "
    "3-5 sentences max. Cover: what changed since last entry, why positions were opened "
    "(use K9 rationale), what's working/not working, and what to watch next. "
    "Reference specific prices, grades, key levels. No generic observations. "
    "If nothing meaningful changed, just say 'Holding steady' and note one thing to watch. "
    "Never repeat data that's already in the structured section above."
)

# Thresholds for meaningful changes (avoid noise)
PNL_CHANGE_THRESHOLD = 0.50  # Only journal if total P&L moved > $0.50
POSITION_CHECK_INTERVAL = 900  # 15 min in seconds

# Paths
JOURNAL_DIR = Path(__file__).resolve().parent.parent.parent / ".core" / "reports" / "cthulu"
K9_LOG = Path("/home/adam/workspace/projects/cthulu-daemon/logs/k9_brain.log")
CTHULU_TRADES_LOG = Path("/home/adam/workspace/memory/cthulu-trades.log")


# ── Helpers ──────────────────────────────────────────────────────────

def _now_pkt() -> datetime:
    """Current time in PKT."""
    return datetime.now(PKT)


def _fmt_pkt(dt: datetime | None = None) -> str:
    """Format datetime as HH:MM PKT."""
    dt = dt or _now_pkt()
    return dt.strftime("%H:%M PKT")


def _journal_path(dt: datetime | None = None) -> Path:
    """Get today's journal file path."""
    dt = dt or _now_pkt()
    return JOURNAL_DIR / f"trades-{dt.strftime('%Y-%m-%d')}.md"


def _pnl_icon(profit: float) -> str:
    return "🟢" if profit >= 0 else "🔴"


def _direction(pos_type: int) -> str:
    return "Long" if pos_type == 0 else "Short"


# ── CthulhOps Agent ─────────────────────────────────────────────────

class CthulhOps:
    """
    Cthulu Operational Agent — dedicated trading ops monitor.
    
    Runs as scheduled PULSE jobs, not a standalone process.
    Consumes webhook API at localhost:9002 for all trading data.
    """

    def __init__(self, bus=None, workspace: str = ""):
        self.bus = bus
        self.workspace = workspace or "/home/adam/workspace"
        
        # State tracking (in-memory, rebuilt on restart)
        self._last_positions: dict[int, dict] = {}  # ticket → position data
        self._last_account: dict = {}
        self._last_health_ok: bool = True
        self._last_bridge_ok: bool = True
        self._last_pnl: float = 0.0  # Last total P&L for change detection
        self._consecutive_failures: int = 0
        self._boot_time = time.monotonic()
        self._known_tickets: set[int] = set()  # Tickets we've already journaled as OPENED
        
        # Ensure journal directory exists
        JOURNAL_DIR.mkdir(parents=True, exist_ok=True)
        
        # Initialize known tickets from existing journal
        self._load_known_tickets()
        
        logger.info("🐙 CthulhOps initialized")

    def _load_known_tickets(self) -> None:
        """Load known ticket IDs from today's journal to avoid duplicate OPENED entries."""
        path = _journal_path()
        if path.exists():
            content = path.read_text()
            # Extract ticket numbers from journal
            for match in re.finditer(r'ticket (\d+)', content):
                self._known_tickets.add(int(match.group(1)))

    # ── HTTP Helpers ─────────────────────────────────────────────

    async def _get_json(self, path: str, timeout: float = 5.0) -> Optional[dict]:
        """GET JSON from webhook server. Returns None on failure."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{WEBHOOK_BASE}{path}",
                    timeout=aiohttp.ClientTimeout(total=timeout),
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    logger.warning(f"Webhook {path} returned {resp.status}")
                    return None
        except Exception as e:
            logger.warning(f"Webhook {path} failed: {e}")
            return None

    # ── Health Check (every 5 min) ───────────────────────────────

    async def check_health(self) -> dict:
        """
        Full health check: webhook, K9 brain, bridge on Victus, tick freshness.
        Returns status dict for logging/alerting.
        """
        status = {
            "timestamp": _now_pkt().isoformat(),
            "webhook": False,
            "k9_brain": False,
            "bridge": False,
            "mt5": False,
            "tick_fresh": False,
            "daemon": False,
            "alerts": [],
        }

        # 1. Webhook server
        health = await self._get_json("/health")
        if health:
            status["webhook"] = True
            self._consecutive_failures = 0
        else:
            self._consecutive_failures += 1
            status["alerts"].append("Webhook server DOWN")
            if self._consecutive_failures >= 3:
                await self._try_restart_webhook()
                status["alerts"].append("Attempted webhook restart")

        # 2. K9 Brain process
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: subprocess.run(
                    ["pgrep", "-f", "k9.live"],
                    capture_output=True, timeout=5,
                ),
            )
            status["k9_brain"] = result.returncode == 0
            if not status["k9_brain"]:
                status["alerts"].append("K9 brain process NOT running")
        except Exception as e:
            logger.warning(f"K9 brain check failed: {e}")

        # 3. Cthulu daemon service
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: subprocess.run(
                    ["systemctl", "--user", "is-active", "cthulu-daemon.service"],
                    capture_output=True, text=True, timeout=5,
                ),
            )
            status["daemon"] = result.stdout.strip() == "active"
            if not status["daemon"]:
                status["alerts"].append("cthulu-daemon.service inactive")
        except Exception as e:
            logger.warning(f"Daemon check failed: {e}")

        # 4. Bridge + MT5 on Victus
        victus_status = await self.check_victus()
        status["bridge"] = victus_status.get("bridge", False)
        status["mt5"] = victus_status.get("mt5", False)
        if not status["bridge"]:
            status["alerts"].append("Bridge DOWN on Victus")
        if not status["mt5"]:
            status["alerts"].append("MT5 terminal DOWN on Victus (needs GUI)")

        # 5. Tick freshness (BTC as canary)
        tick = await self._get_json("/latest_tick?symbol=BTCUSD%23")
        if tick:
            tick_time = tick.get("time", 0)
            if tick_time:
                age = time.time() - float(tick_time)
                status["tick_fresh"] = age < 120  # 2 min tolerance
                if not status["tick_fresh"]:
                    status["alerts"].append(f"Stale ticks — BTCUSD# last tick {int(age)}s ago")
        else:
            status["alerts"].append("No tick data available")

        # Track state changes
        was_healthy = self._last_health_ok
        is_healthy = not status["alerts"]
        self._last_health_ok = is_healthy

        # Alert on state transitions
        if was_healthy and not is_healthy:
            await self.alert("warning", "🐙 Health degraded:\n" + "\n".join(f"• {a}" for a in status["alerts"]))
        elif not was_healthy and is_healthy:
            await self.alert("info", "🐙 All systems recovered ✅")

        # Critical alerts always escalate
        critical_alerts = [a for a in status["alerts"] if "DOWN" in a or "NOT running" in a]
        if critical_alerts and self._consecutive_failures >= 2:
            await self.alert("critical", "🚨 CTHULU CRITICAL:\n" + "\n".join(f"• {a}" for a in critical_alerts))

        return status

    # ── Victus Check ─────────────────────────────────────────────

    async def check_victus(self) -> dict:
        """Check bridge and MT5 on Victus via SSH."""
        result = {"bridge": False, "mt5": False, "error": None}

        try:
            # Check bridge (python process)
            proc = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: subprocess.run(
                    ["ssh", "-o", "ConnectTimeout=5", "victus",
                     'tasklist /FI "IMAGENAME eq python.exe" /NH'],
                    capture_output=True, text=True, timeout=10,
                ),
            )
            if proc.returncode == 0 and "python.exe" in proc.stdout:
                result["bridge"] = True
            elif proc.returncode != 0:
                result["error"] = "SSH to Victus failed"
                return result

            # Check MT5 terminal
            proc = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: subprocess.run(
                    ["ssh", "-o", "ConnectTimeout=5", "victus",
                     'tasklist /FI "IMAGENAME eq terminal64.exe" /NH'],
                    capture_output=True, text=True, timeout=10,
                ),
            )
            if proc.returncode == 0 and "terminal64.exe" in proc.stdout:
                result["mt5"] = True

        except subprocess.TimeoutExpired:
            result["error"] = "SSH timeout"
        except Exception as e:
            result["error"] = str(e)

        # Self-heal: try restarting bridge if down but MT5 is up
        if not result["bridge"] and result["mt5"] and not result.get("error"):
            await self._try_restart_bridge()

        self._last_bridge_ok = result["bridge"]
        return result

    # ── Position Check (every 15 min) ────────────────────────────

    async def check_positions(self) -> dict:
        """
        Fetch current positions and account, compare with last known state.
        Detect new trades, closed trades, significant P&L changes.
        Writes intelligent journal entries — not data dumps.
        """
        positions_data = await self._get_json("/positions")
        account_data = await self._get_json("/account")

        if not positions_data or not account_data:
            logger.warning("Could not fetch positions/account data")
            return {"error": "data_unavailable"}

        current_positions = {}
        for p in positions_data.get("positions", []):
            ticket = p.get("ticket", 0)
            if ticket:
                current_positions[ticket] = p

        balance = account_data.get("balance", 0)
        equity = account_data.get("equity", 0)
        profit = account_data.get("profit", 0)
        margin_level = account_data.get("margin_level", 0)

        # ── Detect meaningful changes ────────────────────────────
        new_tickets = set(current_positions.keys()) - self._known_tickets
        closed_tickets = set(self._last_positions.keys()) - set(current_positions.keys())
        pnl_change = abs(profit - self._last_pnl)
        has_meaningful_change = (
            len(new_tickets) > 0
            or len(closed_tickets) > 0
            or pnl_change >= PNL_CHANGE_THRESHOLD
        )

        # ── Handle new trades (with K9 rationale) ────────────────
        new_trade_details = []
        for ticket in new_tickets:
            pos = current_positions[ticket]
            rationale = self._get_k9_rationale(pos.get("symbol", ""))
            new_trade_details.append({
                "position": pos,
                "rationale": rationale,
            })
            self._known_tickets.add(ticket)
            logger.info(f"New trade: {pos.get('symbol')} {_direction(pos.get('type', 0))} ticket {ticket}")

        # ── Handle closed trades ─────────────────────────────────
        closed_trade_details = []
        for ticket in closed_tickets:
            pos = self._last_positions[ticket]
            closed_trade_details.append(pos)
            pnl = pos.get("profit", 0)
            await self.alert(
                "info",
                f"🐙 Trade closed: {pos.get('symbol')} {_direction(pos.get('type', 0))} "
                f"→ {_pnl_icon(pnl)} ${pnl:+.2f}",
            )
            self._known_tickets.discard(ticket)

        # ── Risk checks ──────────────────────────────────────────
        if balance > 0:
            drawdown_pct = (balance - equity) / balance * 100
            if drawdown_pct > 10:
                await self.alert("warning", f"⚠️ Drawdown alert: {drawdown_pct:.1f}%")
            if 0 < margin_level < 200:
                await self.alert("critical", f"🚨 MARGIN CRITICAL: {margin_level:.0f}%")
            elif 0 < margin_level < 500:
                await self.alert("warning", f"⚠️ Margin low: {margin_level:.0f}%")

        # ── Write intelligent journal entry ──────────────────────
        if has_meaningful_change:
            await self._write_journal_entry(
                account_data, current_positions,
                new_trade_details, closed_trade_details,
            )

        # ── Post compact Discord update ──────────────────────────
        discord_msg = await self._format_discord_update(
            account_data, current_positions,
            new_trade_details, closed_trade_details,
        )
        if discord_msg:
            await self._post_discord_webhook(discord_msg)

        # Update state
        self._last_positions = current_positions
        self._last_account = account_data
        self._last_pnl = profit

        return {
            "balance": balance,
            "equity": equity,
            "profit": profit,
            "positions": len(current_positions),
            "new_trades": len(new_tickets),
            "closed_trades": len(closed_tickets),
        }

    # ── K9 Rationale Extraction ──────────────────────────────────

    def _get_k9_rationale(self, symbol: str) -> Optional[str]:
        """Extract K9's rationale for a specific symbol from its log.
        
        Reads the K9 brain log backwards to find the most recent
        trade rationale block for the given symbol.
        Returns a condensed version: thesis + grade + key evidence.
        """
        try:
            if not K9_LOG.exists():
                return None
            
            # Read last 500 lines (covers ~5 scan cycles)
            result = subprocess.run(
                ["tail", "-500", str(K9_LOG)],
                capture_output=True, text=True, timeout=5,
            )
            if result.returncode != 0:
                return None
            
            lines = result.stdout.split("\n")
            
            # Find the most recent rationale block for this symbol
            # Look for "SHORT/LONG SYMBOL" header lines
            sym_clean = symbol.rstrip("#")
            rationale_start = None
            
            for i in range(len(lines) - 1, -1, -1):
                line = lines[i].strip()
                if sym_clean in line and ("SHORT" in line or "LONG" in line or "BUY" in line or "SELL" in line):
                    if "═" in line or "THESIS:" in lines[min(i+2, len(lines)-1)]:
                        rationale_start = i
                        break
            
            if rationale_start is None:
                return None
            
            # Extract the block (up to next separator or 30 lines)
            block_lines = []
            for j in range(rationale_start, min(rationale_start + 30, len(lines))):
                line = lines[j].strip()
                if line.startswith("═" * 5) and j > rationale_start + 1:
                    break
                block_lines.append(line)
            
            # Extract key fields
            thesis = ""
            grade = ""
            evidence = []
            concerns = []
            
            for line in block_lines:
                if line.startswith("THESIS:"):
                    thesis = line.replace("THESIS:", "").strip()
                elif line.startswith("GRADE:"):
                    grade = line.replace("GRADE:", "").strip()
                elif line.startswith("✓"):
                    evidence.append(line.replace("✓", "").strip())
                elif line.startswith("⚠"):
                    concerns.append(line.replace("⚠", "").strip())
            
            # Build condensed rationale
            parts = []
            if thesis:
                parts.append(thesis)
            if grade:
                parts.append(f"Grade: {grade}")
            if evidence:
                parts.append("Evidence: " + "; ".join(evidence[:3]))
            if concerns:
                parts.append("Concerns: " + "; ".join(concerns[:2]))
            
            return " | ".join(parts) if parts else None
            
        except Exception as e:
            logger.debug(f"K9 rationale extraction failed: {e}")
            return None

    def _read_k9_last_scan(self) -> Optional[str]:
        """Read the last scan summary line from K9 brain log."""
        try:
            if not K9_LOG.exists():
                return None
            result = subprocess.run(
                ["tail", "-10", str(K9_LOG)],
                capture_output=True, text=True, timeout=3,
            )
            for line in reversed(result.stdout.strip().split("\n")):
                line = line.strip()
                if line.startswith("#") and "|" in line:
                    return line
            return None
        except Exception:
            return None

    # ── Previous Journal Reading ─────────────────────────────────

    def _read_previous_entry(self) -> str:
        """Read the last journal entry for context continuity.
        
        Returns the last ~500 chars of the journal, focused on the
        most recent narrative section (not raw data).
        """
        path = _journal_path()
        if not path.exists():
            return "No previous entries today — this is the first."
        
        content = path.read_text()
        if not content.strip():
            return "Journal exists but empty."
        
        # Find the last narrative section (starts after "> 📝")
        narrative_marker = "> 📝"
        last_idx = content.rfind(narrative_marker)
        
        if last_idx >= 0:
            # Return from the last narrative to end
            return content[last_idx:].strip()[-800:]
        
        # Fallback: return last 500 chars
        return content[-500:].strip()

    # ── Intelligent Journal Writing ──────────────────────────────

    async def _write_journal_entry(
        self,
        account: dict,
        positions: dict[int, dict],
        new_trades: list[dict],
        closed_trades: list[dict],
    ) -> None:
        """Write a meaningful journal entry with narrative continuity.
        
        Structure:
        1. Structured data header (compact)
        2. AI-generated narrative (context-aware, reads previous entry)
        """
        now = _now_pkt()
        path = _journal_path(now)
        
        balance = account.get("balance", 0)
        equity = account.get("equity", 0)
        profit = account.get("profit", 0)
        
        # ── Structured header ────────────────────────────────────
        lines = [
            f"\n---\n",
            f"### {_fmt_pkt(now)} — ",
        ]
        
        # Determine entry type
        if new_trades and closed_trades:
            lines[-1] += "Trades Opened & Closed"
        elif new_trades:
            lines[-1] += f"New Trade{'s' if len(new_trades) > 1 else ''}"
        elif closed_trades:
            lines[-1] += f"Trade{'s' if len(closed_trades) > 1 else ''} Closed"
        else:
            lines[-1] += "Position Update"
        
        lines.append(f"**Account:** ${balance:.2f} | Equity ${equity:.2f} | P&L {_pnl_icon(profit)} ${profit:+.2f}")
        
        # New trades with rationale
        for td in new_trades:
            pos = td["position"]
            sym = pos.get("symbol", "?")
            direction = _direction(pos.get("type", 0))
            vol = pos.get("volume", 0)
            op = pos.get("price_open", 0)
            sl = pos.get("sl", 0)
            tp = pos.get("tp", 0)
            comment = pos.get("comment", "")
            ticket = pos.get("ticket", 0)
            
            lines.append(f"**OPENED** {sym} {direction} {vol} lots @ {op} (ticket {ticket})")
            lines.append(f"  SL: {sl} | TP: {tp} | {comment}")
            
            if td.get("rationale"):
                lines.append(f"  *K9 Rationale:* {td['rationale']}")
        
        # Closed trades
        for pos in closed_trades:
            sym = pos.get("symbol", "?")
            direction = _direction(pos.get("type", 0))
            pnl = pos.get("profit", 0)
            lines.append(f"**CLOSED** {sym} {direction} → {_pnl_icon(pnl)} ${pnl:+.2f}")
        
        # Current positions (compact)
        if positions and not new_trades:
            for p in positions.values():
                sym = p.get("symbol", "?")
                pnl = p.get("profit", 0)
                lines.append(f"  {_pnl_icon(pnl)} {sym} {_direction(p.get('type',0))} ${pnl:+.2f}")
        
        # K9 scan status
        k9_status = self._read_k9_last_scan()
        if k9_status:
            lines.append(f"*K9:* {k9_status}")
        
        # ── Generate narrative observation ───────────────────────
        previous = self._read_previous_entry()
        
        # Build context for the copilot
        context_parts = [
            f"Previous journal entry: {previous}",
            f"Current state: Balance ${balance:.2f}, P&L ${profit:+.2f}, {len(positions)} positions.",
        ]
        
        for td in new_trades:
            pos = td["position"]
            context_parts.append(
                f"NEW TRADE: {pos.get('symbol')} {_direction(pos.get('type',0))} "
                f"@ {pos.get('price_open')}. "
                f"K9 rationale: {td.get('rationale', 'unknown')}"
            )
        
        for pos in closed_trades:
            context_parts.append(
                f"CLOSED: {pos.get('symbol')} {_direction(pos.get('type',0))} "
                f"P&L ${pos.get('profit', 0):+.2f}"
            )
        
        if not new_trades and not closed_trades:
            pnl_parts = []
            for p in positions.values():
                pnl_parts.append(f"{p.get('symbol')} ${p.get('profit',0):+.2f}")
            context_parts.append(f"Positions unchanged: {', '.join(pnl_parts)}")
            context_parts.append(f"P&L moved ${profit - self._last_pnl:+.2f} since last check.")
        
        context_text = "\n".join(context_parts)
        
        note = await self._generate_narrative(context_text)
        if note:
            lines.append(f"\n> 📝 {note}")
        
        lines.append("")
        self._append_journal(path, "\n".join(lines))

    async def _generate_narrative(self, context: str) -> Optional[str]:
        """Generate a narrative journal observation via copilot proxy.
        
        Context-aware: reads previous entry, K9 rationale, what changed.
        Returns 3-5 sentences of trader's notebook style writing.
        """
        try:
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": JOURNAL_SYSTEM_PROMPT},
                    {"role": "user", "content": context},
                ],
                "max_tokens": 150,
                "temperature": 0.4,
            }
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    COPILOT_URL,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=20),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        choices = data.get("choices", [])
                        if choices:
                            note = choices[0].get("message", {}).get("content", "").strip()
                            if note and len(note) < 1000:
                                return note
                    logger.debug(f"Narrative generation returned {resp.status}")
                    return None
        except Exception as e:
            logger.debug(f"Narrative generation failed (non-fatal): {e}")
            return None

    # ── Discord Update Formatting ────────────────────────────────

    async def _format_discord_update(
        self,
        account: dict,
        positions: dict[int, dict],
        new_trades: list[dict],
        closed_trades: list[dict],
    ) -> Optional[str]:
        """Format a compact Discord update.
        
        Only posts when something meaningful happened.
        Compact: one message, no essays.
        """
        balance = account.get("balance", 0)
        profit = account.get("profit", 0)
        
        lines = [f"🐙 **{_fmt_pkt()}** | ${balance:.2f} | P&L: ${profit:+.2f}"]
        
        # New trades get emphasis
        for td in new_trades:
            pos = td["position"]
            sym = pos.get("symbol", "?")
            direction = _direction(pos.get("type", 0))
            comment = pos.get("comment", "")
            lines.append(f"  🆕 {sym} {direction} @ {pos.get('price_open', 0)} ({comment})")
        
        # Closed trades
        for pos in closed_trades:
            sym = pos.get("symbol", "?")
            pnl = pos.get("profit", 0)
            lines.append(f"  ✖️ {sym} closed → {_pnl_icon(pnl)} ${pnl:+.2f}")
        
        # Existing positions (compact)
        if not new_trades and not closed_trades:
            for p in positions.values():
                sym = p.get("symbol", "?")
                pnl = p.get("profit", 0)
                lines.append(f"  {_pnl_icon(pnl)} {sym} {_direction(p.get('type',0))} ${pnl:+.2f}")
        
        # Generate a one-liner note for Discord (different from journal narrative)
        note_data = (
            f"Balance: ${balance:.2f}, P&L: ${profit:+.2f}, "
            + ", ".join(
                f"{p.get('symbol')} {_direction(p.get('type',0))} ${p.get('profit',0):+.2f}"
                for p in positions.values()
            )
        )
        note = await self._generate_discord_note(note_data)
        if note:
            lines.append(f"  💭 _{note}_")
        
        return "\n".join(lines)

    async def _generate_discord_note(self, market_data: str) -> Optional[str]:
        """Generate a one-liner observation for Discord.
        
        Short, sharp, trader voice. Not the same as the journal narrative.
        """
        try:
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "One sentence, 15 words max. Sharp trader observation. "
                            "Example: 'BTC carrying the book while EUR bleeds — watch for reversal.' "
                            "No introductions. Just the note."
                        ),
                    },
                    {"role": "user", "content": market_data},
                ],
                "max_tokens": 40,
                "temperature": 0.3,
            }
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    COPILOT_URL,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        choices = data.get("choices", [])
                        if choices:
                            note = choices[0].get("message", {}).get("content", "").strip()
                            if note and len(note) < 200:
                                return note
                    return None
        except Exception as e:
            logger.debug(f"Discord note generation failed: {e}")
            return None

    # ── Journaling Helpers ───────────────────────────────────────

    def _append_journal(self, path: Path, content: str) -> None:
        """Append content to a journal file, creating header if new."""
        if not path.exists():
            header = (
                f"# 🐙 Cthulu Trading Journal — {_now_pkt().strftime('%Y-%m-%d')}\n"
                f"*Auto-generated by CthulhOps agent*\n\n"
                f"---\n"
            )
            path.write_text(header)
        with open(path, "a") as f:
            f.write(content)

    # ── Daily Summary (10 PM PKT) ────────────────────────────────

    async def daily_summary(self) -> dict:
        """
        Generate and post daily P&L summary.
        Posts to Discord and writes a reflective end-of-day entry.
        """
        account = await self._get_json("/account")
        positions_data = await self._get_json("/positions")

        if not account:
            await self.alert("warning", "🐙 Daily summary skipped — webhook not responding")
            return {"error": "no_data"}

        balance = account.get("balance", 0)
        equity = account.get("equity", 0)
        profit = account.get("profit", 0)
        margin_level = account.get("margin_level", 0)
        positions = (positions_data or {}).get("positions", [])

        lines = [
            "🐙 **Cthulu Daily Summary**",
            "",
            f"💰 Balance: ${balance:.2f}",
            f"📊 Equity: ${equity:.2f}",
            f"{_pnl_icon(profit)} P&L: ${profit:+.2f}",
        ]
        if margin_level > 0:
            lines.append(f"📐 Margin Level: {margin_level:.0f}%")
        lines.append("")

        if positions:
            lines.append(f"📋 **Open Positions ({len(positions)}):**")
            for p in positions:
                sym = p.get("symbol", "?")
                direction = _direction(p.get("type", 0)).upper()
                vol = p.get("volume", 0)
                pnl = p.get("profit", 0)
                lines.append(f"{_pnl_icon(pnl)} {sym} {direction} {vol} = ${pnl:+.2f}")
        else:
            lines.append("No open positions.")

        summary_text = "\n".join(lines)
        await self._post_discord_webhook(summary_text)

        # Write daily reflection to journal
        previous = self._read_previous_entry()
        day_context = (
            f"End of day. Previous entries: {previous}\n"
            f"Final state: Balance ${balance:.2f}, Equity ${equity:.2f}, P&L ${profit:+.2f}.\n"
            f"{len(positions)} positions open."
        )
        reflection = await self._generate_narrative(day_context)
        
        path = _journal_path()
        eod_entry = f"\n---\n### {_fmt_pkt()} — End of Day\n{summary_text}\n"
        if reflection:
            eod_entry += f"\n> 📝 {reflection}\n"
        self._append_journal(path, eod_entry)

        logger.info("Daily summary posted")
        return {"balance": balance, "equity": equity, "profit": profit, "positions": len(positions)}

    # ── Alerting ─────────────────────────────────────────────────

    async def alert(self, level: str, message: str) -> None:
        """
        Post alert to Discord webhook.
        Levels: info, warning, critical
        Critical alerts tag Ali.
        """
        prefix = {
            "info": "ℹ️",
            "warning": "⚠️",
            "critical": f"🚨 {ALI_MENTION}",
        }.get(level, "")

        full_message = f"{prefix} {message}" if prefix else message

        # Alerts go to heartbeat, not journal
        if level in ("critical", "warning"):
            await self._post_discord_webhook(full_message, CHANNEL_HEARTBEAT)
        
        # Info-level trade alerts go to journal channel
        if level == "info":
            await self._post_discord_webhook(full_message)

        if self.bus:
            await self.bus.emit("cthulu.alert", {
                "level": level,
                "message": message,
                "timestamp": _now_pkt().isoformat(),
            })

        logger.info(f"Alert [{level}]: {message[:80]}")

    async def _post_discord_webhook(self, content: str, channel: str = None) -> bool:
        """Post a message to Discord via bus event (routed to Discord adapter)."""
        target_channel = channel or CHANNEL_JOURNAL
        if self.bus:
            try:
                await self.bus.emit("cthulu.discord.send", {
                    "channel_id": target_channel,
                    "content": content[:2000],
                })
                return True
            except Exception as e:
                logger.debug(f"Bus emit for Discord failed: {e}")
        # Fallback: direct webhook
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    DISCORD_WEBHOOK,
                    json={"content": content[:2000], "username": "🐙 CthulhOps"},
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    return resp.status in (200, 204)
        except Exception as e:
            logger.error(f"Discord post failed: {e}")
            return False

    # ── Self-Healing ─────────────────────────────────────────────

    async def _try_restart_webhook(self) -> bool:
        """Attempt to restart the Cthulu webhook server."""
        logger.warning("Attempting webhook server restart...")
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: subprocess.run(
                    ["systemctl", "--user", "restart", "cthulu-daemon.service"],
                    capture_output=True, text=True, timeout=15,
                ),
            )
            if result.returncode == 0:
                await asyncio.sleep(3)
                health = await self._get_json("/health")
                if health:
                    await self.alert("info", "🐙 Webhook server auto-restarted ✅")
                    return True
            logger.error(f"Webhook restart failed: {result.stderr}")
            return False
        except Exception as e:
            logger.error(f"Webhook restart exception: {e}")
            return False

    async def _try_restart_bridge(self) -> bool:
        """Attempt to restart the bridge on Victus via scheduled task."""
        logger.warning("Attempting bridge restart on Victus...")
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: subprocess.run(
                    ["ssh", "-o", "ConnectTimeout=5", "victus",
                     "schtasks /Run /TN CthulhuBridge"],
                    capture_output=True, text=True, timeout=15,
                ),
            )
            if result.returncode == 0:
                await asyncio.sleep(5)
                await self.alert("info", "🐙 Bridge restart attempted on Victus")
                return True
            return False
        except Exception as e:
            logger.error(f"Bridge restart failed: {e}")
            return False

    # ── Main Cycles (called by PULSE) ────────────────────────────

    async def run_health_cycle(self) -> None:
        """Health check cycle — called every 5 minutes by PULSE."""
        try:
            status = await self.check_health()
            components = sum([
                status.get("webhook", False),
                status.get("k9_brain", False),
                status.get("bridge", False),
                status.get("daemon", False),
            ])
            logger.debug(f"Health: {components}/4 components OK")
        except Exception as e:
            logger.error(f"Health cycle error: {e}")

    async def run_position_cycle(self) -> None:
        """Position check cycle — called every 15 minutes by PULSE."""
        try:
            result = await self.check_positions()
            if "error" not in result:
                logger.debug(
                    f"Positions: {result.get('positions', 0)} open, "
                    f"balance ${result.get('balance', 0):.2f}"
                )
        except Exception as e:
            logger.error(f"Position cycle error: {e}")

    async def run_daily_summary(self) -> None:
        """Daily summary — called once at 17:00 UTC (10 PM PKT) by PULSE."""
        try:
            await self.daily_summary()
        except Exception as e:
            logger.error(f"Daily summary error: {e}")
            await self.alert("warning", f"🐙 Daily summary failed: {e}")
