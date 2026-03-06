"""
NERVE — Inbound Router
========================

Sits between channel adapters and the agent loop.
Handles: policy enforcement, session routing, priority assignment,
deduplication, interrupt detection.

=== MENTION-ONLY PROTOCOL (Day 21 — Ali's design) ===

ONE RULE FOR ALL BOTS:

A bot processes a message IF AND ONLY IF:
  1. It's a DM from an allowed sender, OR
  2. The message contains @mention of this bot's ID

When a bot WANTS to respond → include @mention of the target
When a bot does NOT want to respond → either:
  a) React with emoji (acknowledged, no text, no loop)
  b) Send text WITHOUT any @mention → hits chat, humans read it, no bot picks it up

This kills echo loops structurally. No cooldown timers. No sibling tracking.
No complex routing policies. Just: "does this message mention ME? No → ignore."

@end in any message = universal stop. No bot processes it. Period.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
import uuid
from typing import Callable, Optional

from ..bus import EventBus
from .types import (
    BusEnvelope,
    ChannelPolicy,
    ChannelSource,
    ChatType,
    InboundPayload,
    EnvelopeMetadata,
    MessagePriority,
    PayloadType,
)

logger = logging.getLogger("singularity.nerve.router")


# ── Interrupt Detection ─────────────────────────────────────────────

INTERRUPT_PATTERNS = [
    re.compile(r"^(stop|wait|hold on|pause|cancel|actually|never ?mind)", re.IGNORECASE),
    re.compile(r"^(no[,.]?\s|don'?t\s|abort)", re.IGNORECASE),
    re.compile(r"^(scratch that|forget it|hold up)", re.IGNORECASE),
]

# ── Pre-compiled regex ──────────────────────────────────────────────

_RE_JID_DEVICE = re.compile(r":\d+@s\.whatsapp\.net$")
_RE_AT_END = re.compile(r'@end\b', re.IGNORECASE)


# ── JID Normalization (WhatsApp) ────────────────────────────────────

def _normalize_jid(jid: str) -> str:
    return _RE_JID_DEVICE.sub(r"@s.whatsapp.net", jid)


def _jid_matches(jid: str, target: str) -> bool:
    return _normalize_jid(jid) == _normalize_jid(target)


def _jid_in_list(jid: str, targets: list[str]) -> bool:
    normalized = _normalize_jid(jid)
    return any(normalized == _normalize_jid(t) for t in targets)


# ── Deduplication Cache ─────────────────────────────────────────────

class DeduplicationCache:
    def __init__(self, max_size: int = 10_000, ttl: float = 300.0):
        self._seen: dict[str, float] = {}
        self._max_size = max_size
        self._ttl = ttl

    def check(self, message_id: str) -> bool:
        now = time.time()
        if message_id in self._seen:
            return True
        self._evict(now)
        self._seen[message_id] = now
        return False

    def _evict(self, now: float) -> None:
        if len(self._seen) < self._max_size:
            return
        expired = [k for k, ts in self._seen.items() if now - ts > self._ttl]
        for k in expired:
            del self._seen[k]
        if len(self._seen) >= self._max_size:
            oldest = next(iter(self._seen))
            del self._seen[oldest]


# ── Session Route ───────────────────────────────────────────────────

class SessionRoute:
    __slots__ = ("channel_type", "chat_id", "session_id", "last_active")

    def __init__(self, channel_type: str, chat_id: str, session_id: str):
        self.channel_type = channel_type
        self.chat_id = chat_id
        self.session_id = session_id
        self.last_active = time.time()


# ── Router ──────────────────────────────────────────────────────────

class InboundRouter:
    """
    Routes inbound messages using the Mention-Only Protocol.
    
    Events emitted:
        nerve.routed     — message passed policy, assigned to session
        nerve.rejected   — message rejected by policy
        nerve.interrupt  — interrupt detected during active turn
    """

    def __init__(
        self,
        bus: EventBus,
        policies: Optional[dict[str, ChannelPolicy]] = None,
        default_policy: Optional[ChannelPolicy] = None,
        global_owner_ids: Optional[list[str]] = None,
        active_sessions_fn: Optional[Callable[[], set[str]]] = None,
    ):
        self._bus = bus
        self._policies = policies or {}
        self._default_policy = default_policy or ChannelPolicy()
        self._global_owner_ids = global_owner_ids or []
        self._get_active_sessions = active_sessions_fn or (lambda: set())
        self._dedup = DeduplicationCache()
        self._routes: dict[str, SessionRoute] = {}
        self._session_counter = 0

    def route(
        self,
        source: ChannelSource,
        payload: InboundPayload,
        platform_message_id: Optional[str] = None,
    ) -> bool:
        """Route an inbound message. Returns False if rejected."""
        logger.info(
            "route() called: sender=%s chat=%s type=%s mentions=%s mid=%s",
            source.sender_id, source.chat_id, source.chat_type,
            source.mentions, platform_message_id,
        )

        # 1. Deduplication
        dedup_key = platform_message_id or f"{source.adapter_id}:{source.chat_id}:{time.time()}"
        if self._dedup.check(dedup_key):
            logger.info("Dedup rejected: %s from %s", dedup_key, source.sender_id)
            return False

        # 2. @end — universal conversation terminator
        if payload.text and _RE_AT_END.search(payload.text):
            logger.info("@end terminator: %s in %s", source.sender_id, source.chat_id)
            return False

        # 3. Policy check (mention-only protocol)
        policy = self._get_policy(source.channel_type)
        if not self._check_policy(policy, source):
            logger.info("Policy rejected: %s in %s", source.sender_id, source.chat_id)
            self._schedule_emit("nerve.rejected", {
                "reason": "policy",
                "sender": source.sender_id,
                "chat": source.chat_id,
            })
            return False

        # 4. Resolve session
        session_id = self._resolve_session(source)

        # 5. Assign priority
        priority = self._assign_priority(policy, source, payload, session_id)

        # 6. Build envelope
        envelope = BusEnvelope(
            id=str(uuid.uuid4()),
            timestamp=time.time(),
            priority=priority,
            source=source,
            session_id=session_id,
            payload=payload,
            metadata=EnvelopeMetadata(
                platform_message_id=platform_message_id,
            ),
        )

        # 7. Emit
        event_name = "nerve.interrupt" if priority == MessagePriority.INTERRUPT else "nerve.routed"
        self._schedule_emit(event_name, {"envelope": envelope})

        logger.info(
            "Routed %s from %s → session %s [%s]",
            payload.type.value, source.sender_id, session_id, priority.value,
        )
        return True

    def _schedule_emit(self, event_name: str, data: dict) -> None:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self._bus.emit(event_name, data))
        except RuntimeError:
            logger.debug("No event loop, buffering event: %s", event_name)

    # ── Policy ───────────────────────────────────────────────────────

    def _get_policy(self, channel_type: str) -> ChannelPolicy:
        return self._policies.get(channel_type, self._default_policy)

    def _check_policy(self, policy: ChannelPolicy, source: ChannelSource) -> bool:
        """
        Mention-Only Protocol (Day 21):
        
        DMs: allowed senders get through (allowlist) or everyone (open)
        Groups/Channels/Threads: message MUST contain @mention of this bot's self_id
        
        That's it. One rule.
        """
        # Ignored channels
        if source.chat_id in (policy.ignored_channels or []):
            return False

        # DMs — use DM policy (owner bypass, allowlist, open, deny)
        if source.chat_type == ChatType.DM:
            if self._is_owner(policy, source.sender_id):
                return True
            if policy.dm_policy == "open":
                return True
            if policy.dm_policy == "allowlist":
                return _jid_in_list(source.sender_id, policy.allowed_senders)
            return False  # deny

        # Groups, Channels, Threads — ONLY respond if @mentioned
        if source.chat_type in (ChatType.GROUP, ChatType.CHANNEL, ChatType.THREAD):
            return self._is_mentioned(policy, source)

        return False

    def _is_owner(self, policy: ChannelPolicy, sender_id: str) -> bool:
        if _jid_in_list(sender_id, policy.owner_ids):
            return True
        if _jid_in_list(sender_id, self._global_owner_ids):
            return True
        return False

    def _is_mentioned(self, policy: ChannelPolicy, source: ChannelSource) -> bool:
        if not policy.self_id or not source.mentions:
            return False
        return policy.self_id in source.mentions

    # ── Session ──────────────────────────────────────────────────────

    def _resolve_session(self, source: ChannelSource) -> str:
        route_key = f"{source.adapter_id}:{source.chat_id}"
        existing = self._routes.get(route_key)

        if existing:
            existing.last_active = time.time()
            return existing.session_id

        self._session_counter += 1
        session_id = f"{source.adapter_id}-{source.chat_id}-{self._session_counter}"
        self._routes[route_key] = SessionRoute(
            channel_type=source.channel_type,
            chat_id=source.chat_id,
            session_id=session_id,
        )
        return session_id

    # ── Priority ─────────────────────────────────────────────────────

    def _assign_priority(
        self,
        policy: ChannelPolicy,
        source: ChannelSource,
        payload: InboundPayload,
        session_id: str,
    ) -> MessagePriority:
        if payload.type in (PayloadType.TYPING, PayloadType.PRESENCE):
            return MessagePriority.BACKGROUND
        if payload.type == PayloadType.REACTION:
            return MessagePriority.LOW

        is_owner = self._is_owner(policy, source.sender_id)
        text = (payload.text or "").strip()

        active = self._get_active_sessions()
        session_active = session_id in active

        if is_owner and session_active:
            if any(p.search(text) for p in INTERRUPT_PATTERNS):
                return MessagePriority.INTERRUPT
            return MessagePriority.HIGH

        if is_owner:
            return MessagePriority.HIGH

        if source.chat_type == ChatType.DM:
            return MessagePriority.NORMAL

        return MessagePriority.NORMAL  # If we got here, we were @mentioned

    # ── Route Management ─────────────────────────────────────────────

    def get_routes(self) -> list[SessionRoute]:
        return list(self._routes.values())

    def get_session_id(self, adapter_id: str, chat_id: str) -> Optional[str]:
        route = self._routes.get(f"{adapter_id}:{chat_id}")
        return route.session_id if route else None

    def prune_routes(self, max_idle: float = 3600.0) -> int:
        now = time.time()
        stale = [
            k for k, r in self._routes.items()
            if now - r.last_active > max_idle
        ]
        for k in stale:
            del self._routes[k]
        return len(stale)

    def set_policy(self, channel_type: str, policy: ChannelPolicy) -> None:
        self._policies[channel_type] = policy
