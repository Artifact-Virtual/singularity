"""Ollama Cloud provider — hosted open-weight models via ollama.com API.

OpenAI-compatible endpoint at ollama.com/v1/.
Provides access to massive open-weight models (DeepSeek V3.2, Qwen3.5 397B,
Kimi K2.5, Cogito 2.1 671B, etc.) that can't run locally.

Chain position: Fallback (after Copilot proxy, before local Ollama).
"""

import json
import logging
import asyncio
import time
from typing import Optional, AsyncIterator

import aiohttp

from .provider import (
    ChatProvider,
    ChatMessage,
    ChatResponse,
    StreamChunk,
)

logger = logging.getLogger("singularity.voice.ollama_cloud")

DEFAULT_MODEL = "deepseek-v3.2"
OLLAMA_CLOUD_BASE_URL = "https://ollama.com/v1"


class OllamaCloudProvider(ChatProvider):
    """Ollama Cloud — hosted open-weight models.
    
    Uses OpenAI-compatible API.
    Base URL: https://ollama.com/v1
    Auth: Bearer token (Ollama API key)
    """

    provider_name = "ollama-cloud"

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_MODEL,
        base_url: str = OLLAMA_CLOUD_BASE_URL,
        timeout: float = 120.0,
        max_retries: int = 2,
        **kwargs,
    ):
        super().__init__(name="ollama-cloud", model=model, **kwargs)
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self._session: Optional[aiohttp.ClientSession] = None
        logger.info(
            "OllamaCloud provider init (model=%s, base=%s)",
            self.model, self.base_url,
        )

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout),
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
        return self._session

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        tools: Optional[list[dict]] = None,
        temperature: float = 0.7,
        max_tokens: int = 16384,
        **kwargs,
    ) -> AsyncIterator[StreamChunk]:
        """Stream chat completion from Ollama Cloud."""
        session = await self._get_session()

        payload = {
            "model": self.model,
            "messages": [m.to_dict() for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        if tools:
            payload["tools"] = tools

        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                ) as resp:
                    if resp.status == 401:
                        self._last_failure = time.perf_counter()
                        raise RuntimeError(
                            "Ollama Cloud authentication failed — check API key"
                        )
                    if resp.status == 429:
                        retry_after = float(resp.headers.get("Retry-After", 5))
                        logger.warning("Ollama Cloud rate limited, waiting %ss", retry_after)
                        await asyncio.sleep(retry_after)
                        continue
                    if resp.status >= 500:
                        body = await resp.text()
                        last_error = RuntimeError(
                            f"Ollama Cloud server error {resp.status}: {body[:200]}"
                        )
                        if attempt < self.max_retries:
                            await asyncio.sleep(2 ** attempt)
                        continue
                    if resp.status != 200:
                        body = await resp.text()
                        raise RuntimeError(
                            f"Ollama Cloud error {resp.status}: {body[:200]}"
                        )

                    # Stream SSE chunks
                    async for line in resp.content:
                        line = line.decode("utf-8").strip()
                        if not line or not line.startswith("data: "):
                            continue
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            yield StreamChunk(
                                delta="",
                                # finished via finish_reason
                                finish_reason="stop",
                            )
                            self._last_success = time.perf_counter()
                            return

                        try:
                            data = json.loads(data_str)
                            choice = data["choices"][0]
                            delta = choice.get("delta", {})
                            content = delta.get("content", "")
                            reasoning = delta.get("reasoning", "")
                            finish = choice.get("finish_reason")
                            
                            # For thinking models (DeepSeek, Kimi-thinking),
                            # reasoning tokens stream before content tokens.
                            # If content is empty, use reasoning as the delta
                            # so the base class chat() accumulates the full
                            # response regardless of which field carries it.
                            effective_content = content or reasoning
                            
                            # Handle tool call deltas
                            tool_call_delta = None
                            if "tool_calls" in delta:
                                tc = delta["tool_calls"][0]
                                tool_call_delta = {
                                    "index": tc.get("index", 0),
                                    "id": tc.get("id"),
                                    "function": tc.get("function", {}),
                                }

                            if effective_content or tool_call_delta or finish:
                                yield StreamChunk(
                                    delta=effective_content,
                                    finish_reason=finish,
                                    tool_call_delta=tool_call_delta,
                                    usage=data.get("usage"),
                                )
                            if finish:
                                self._last_success = time.perf_counter()
                                return
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue

                    # Stream ended without [DONE]
                    self._last_success = time.perf_counter()
                    return

            except RuntimeError:
                self._last_failure = time.perf_counter()
                raise
            except aiohttp.ClientError as e:
                last_error = e
                self._last_failure = time.perf_counter()
                if attempt < self.max_retries:
                    wait = 2 ** attempt
                    logger.warning(
                        "OllamaCloud attempt %d failed (%s), retry in %ds",
                        attempt + 1, str(e)[:100], wait,
                    )
                    await asyncio.sleep(wait)
                continue
            except Exception as e:
                last_error = e
                self._last_failure = time.perf_counter()
                if attempt < self.max_retries:
                    wait = 2 ** attempt
                    logger.warning(
                        "OllamaCloud attempt %d failed (%s), retry in %ds",
                        attempt + 1, str(e)[:100], wait,
                    )
                    await asyncio.sleep(wait)
                continue

        raise RuntimeError(
            f"Ollama Cloud failed after {self.max_retries + 1} attempts: {last_error}"
        )

    async def health(self) -> bool:
        """Check if Ollama Cloud API is reachable."""
        try:
            session = await self._get_session()
            async with session.get(f"{self.base_url}/models") as resp:
                return resp.status == 200
        except Exception:
            return False

    async def close(self) -> None:
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

    def __repr__(self) -> str:
        healthy = self._last_failure == 0 or self._last_success > self._last_failure
        return f"OllamaCloudProvider(model={self.model}, healthy={healthy})"
