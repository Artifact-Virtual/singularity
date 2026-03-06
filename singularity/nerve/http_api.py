"""
NERVE — HTTP API Channel Adapter
===================================

Exposes a REST API for external clients (ERP Studio, web apps, CLI tools)
to send messages and receive responses. Routes through the same cortex
pipeline as Discord/WhatsApp.

Endpoints:
    POST /api/v1/chat    — send a message, get a response (JSON)
    GET  /api/v1/health  — gateway health + status
    GET  /api/v1/status  — alias for health (Mach6 compat)

Auth: Bearer token in Authorization header (SINGULARITY_API_KEY from env)

Architecture:
    HttpApiAdapter extends BaseAdapter, plugging into the same nerve router
    and cortex engine as every other channel. Messages arrive via HTTP,
    get normalized into BusEnvelopes, processed by cortex, and returned
    as JSON responses.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from typing import Any, Callable, Coroutine, Dict, Optional
from aiohttp import web

from .adapter import BaseAdapter
from .types import (
    ChannelCapabilities,
    ChannelSource,
    ChatType,
    InboundPayload,
    OutboundMessage,
    PayloadType,
    RateLimitConfig,
    SendResult,
)

logger = logging.getLogger("singularity.nerve.http_api")


class HttpApiAdapter(BaseAdapter):
    """
    HTTP API channel adapter for Singularity.

    Serves a lightweight aiohttp server that accepts chat requests,
    routes them through the cortex engine, and returns responses.
    """

    def __init__(
        self,
        port: int = 8450,
        host: str = "0.0.0.0",
        api_key: Optional[str] = None,
        allowed_origins: Optional[list[str]] = None,
    ):
        super().__init__("http-api")
        self._port = port
        self._host = host
        self._api_key = api_key or os.environ.get("SINGULARITY_API_KEY", "")
        self._allowed_origins = allowed_origins or ["*"]
        self._app: Optional[web.Application] = None
        self._runner: Optional[web.AppRunner] = None
        self._site: Optional[web.TCPSite] = None
        self._boot_time = time.time()

        # Pending responses: request_id → asyncio.Future[str]
        self._pending: Dict[str, asyncio.Future] = {}

        # Cortex processor callback (set by runtime)
        self._process_fn: Optional[Callable] = None

        # Stats
        self._total_requests = 0
        self._total_errors = 0

    @property
    def channel_type(self) -> str:
        return "http"

    @property
    def capabilities(self) -> ChannelCapabilities:
        return ChannelCapabilities(
            max_message_length=100_000,  # No real limit for HTTP
            media=False,
            threads=False,
            reactions=False,
            embeds=False,
            message_edit=False,
            message_delete=False,
            typing_indicator=False,
            read_receipts=False,
            rate_limits=RateLimitConfig(
                messages_per_second=20.0,
                burst_size=50,
            ),
        )

    def set_processor(self, fn: Callable[..., Coroutine]) -> None:
        """Set the cortex processing function.
        
        Signature: async fn(session_id, message, source, sender_name) -> CortexResult
        """
        self._process_fn = fn

    # ── Platform Lifecycle ─────────────────────────────────────────

    async def platform_connect(self, config: dict) -> None:
        """Start the HTTP API server."""
        self._app = web.Application(middlewares=[self._cors_middleware])
        self._app.router.add_route("OPTIONS", "/{path:.*}", self._handle_options)
        self._app.router.add_get("/api/v1/health", self._handle_health)
        self._app.router.add_get("/api/v1/status", self._handle_health)  # Mach6 compat
        self._app.router.add_post("/api/v1/chat", self._handle_chat)

        self._runner = web.AppRunner(self._app, access_log=None)
        await self._runner.setup()

        try:
            self._site = web.TCPSite(self._runner, self._host, self._port)
            await self._site.start()
            self._boot_time = time.time()
            logger.info(f"HTTP API listening on http://{self._host}:{self._port}/api/v1/")
        except OSError as e:
            if "Address already in use" in str(e):
                logger.warning(f"HTTP API port {self._port} in use — API disabled (non-fatal)")
                self._site = None
            else:
                raise

    async def platform_disconnect(self) -> None:
        """Stop the HTTP API server."""
        # Cancel all pending requests
        for fut in self._pending.values():
            if not fut.done():
                fut.cancel()
        self._pending.clear()

        if self._site:
            await self._site.stop()
        if self._runner:
            await self._runner.cleanup()
        logger.info("HTTP API stopped")

    async def platform_reconnect(self) -> None:
        """Restart the HTTP API server."""
        await self.platform_disconnect()
        await self.platform_connect({})

    async def platform_send(self, chat_id: str, message: OutboundMessage) -> SendResult:
        """
        'Send' a response by resolving the pending future for this chat_id.
        
        chat_id for HTTP is the request_id. When the cortex finishes processing,
        the runtime calls adapter.send(request_id, response) which resolves
        the future that the HTTP handler is awaiting.
        """
        fut = self._pending.get(chat_id)
        if fut and not fut.done():
            fut.set_result(message.content)
            return SendResult(success=True, message_id=chat_id)
        return SendResult(success=False, error=f"No pending request for {chat_id}")

    # ── CORS Middleware ────────────────────────────────────────────

    @web.middleware
    async def _cors_middleware(self, request: web.Request, handler):
        origin = request.headers.get("Origin", "*")
        allowed = self._allowed_origins

        allow_origin = origin if ("*" in allowed or origin in allowed) else (allowed[0] if allowed else "*")

        response = await handler(request)
        response.headers["Access-Control-Allow-Origin"] = allow_origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Max-Age"] = "86400"
        return response

    async def _handle_options(self, request: web.Request) -> web.Response:
        """Handle CORS preflight."""
        return web.Response(status=204)

    # ── Auth ───────────────────────────────────────────────────────

    def _authenticate(self, request: web.Request) -> bool:
        """Verify Bearer token."""
        if not self._api_key:
            # No API key configured — reject all
            logger.warning("HTTP API: No SINGULARITY_API_KEY configured, rejecting request")
            return False

        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return False

        token = auth[7:]
        # Constant-time comparison
        return hmac.compare_digest(token, self._api_key)

    # ── Health Endpoint ────────────────────────────────────────────

    async def _handle_health(self, request: web.Request) -> web.Response:
        """Return API health status."""
        uptime = time.time() - self._boot_time
        data = {
            "status": "ok",
            "runtime": "singularity",
            "uptime": round(uptime, 1),
            "totalRequests": self._total_requests,
            "totalErrors": self._total_errors,
            "pendingRequests": len(self._pending),
            "timestamp": time.time(),
        }
        return web.json_response(data)

    # ── Chat Endpoint ──────────────────────────────────────────────

    async def _handle_chat(self, request: web.Request) -> web.Response:
        """
        Handle POST /api/v1/chat
        
        Body: { "message": "...", "sessionId": "...", "senderId": "...", "senderName": "..." }
        Response: { "response": "...", "sessionId": "...", "durationMs": N }
        """
        # Auth check
        if not self._authenticate(request):
            return web.json_response({"error": "Unauthorized"}, status=401)

        # Parse body
        try:
            body = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON"}, status=400)

        message = body.get("message", "").strip()
        if not message:
            return web.json_response({"error": "message field is required"}, status=400)

        session_id = body.get("sessionId", f"http-erp-{body.get('senderId', 'anon')}")
        sender_id = body.get("senderId", "http-user")
        sender_name = body.get("senderName", "User")

        self._total_requests += 1
        request_id = str(uuid.uuid4())

        logger.info(
            f"HTTP chat: \"{message[:80]}...\" "
            f"(session={session_id}, sender={sender_name})"
        )

        # Create source info
        source = ChannelSource(
            channel_type="http",
            adapter_id="http-api",
            chat_id=request_id,  # Use request_id as chat_id for response routing
            chat_type=ChatType.DM,
            sender_id=sender_id,
            sender_name=sender_name,
        )

        start_ms = time.time() * 1000

        # If we have a direct processor, use it (bypasses event bus for simplicity)
        if self._process_fn:
            try:
                result = await asyncio.wait_for(
                    self._process_fn(
                        session_id=session_id,
                        message=message,
                        source=source,
                        sender_name=sender_name,
                    ),
                    timeout=300.0,  # 5 minute timeout
                )

                duration_ms = time.time() * 1000 - start_ms

                if result and result.response:
                    return web.json_response({
                        "response": result.response,
                        "sessionId": session_id,
                        "durationMs": round(duration_ms),
                    })
                else:
                    self._total_errors += 1
                    return web.json_response({
                        "response": "",
                        "sessionId": session_id,
                        "durationMs": round(duration_ms),
                        "error": "No response from cortex",
                    }, status=500)

            except asyncio.TimeoutError:
                self._total_errors += 1
                return web.json_response({
                    "error": "Request timed out (300s)",
                    "sessionId": session_id,
                }, status=504)

            except Exception as e:
                self._total_errors += 1
                logger.error(f"HTTP chat processing error: {e}", exc_info=True)
                return web.json_response({
                    "error": str(e),
                    "sessionId": session_id,
                }, status=500)
        else:
            self._total_errors += 1
            return web.json_response({
                "error": "Cortex processor not available",
            }, status=503)
