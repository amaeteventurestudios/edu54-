"""InferenceAdapter (docs/20, 53): the product never talks to a model runtime directly.

`OllamaInferenceAdapter` is the real backend (port 8120, localhost only). `StubInferenceAdapter` is a
deterministic offline backend for tests and for a box with no models loaded yet. Swapping in llama.cpp
means one more class here and nothing else changes.
"""
from __future__ import annotations

import asyncio
import json
import re
import time
from collections.abc import AsyncIterator
from typing import Protocol

import httpx

from ..config import get_settings


class InferenceError(Exception):
    """Runtime unavailable, timed out or returned an error. The UI shows a plain 'not available' state."""


class InferenceAdapter(Protocol):
    async def available(self) -> bool: ...
    async def stream_chat(self, model: str, messages: list[dict], *, max_tokens: int = 400,
                          temperature: float = 0.3) -> AsyncIterator[str]: ...
    async def chat(self, model: str, messages: list[dict], *, max_tokens: int = 200,
                   temperature: float = 0.0) -> str: ...
    async def models(self) -> list[str]: ...


def _keep_alive(v: str) -> int | str:
    """Ollama wants a number (-1 = forever) or a duration with a unit ("10m"); the bare string "-1" is rejected."""
    try:
        return int(v)
    except ValueError:
        return v


_THINK = re.compile(r"<think>.*?(</think>|$)", re.S)


class _ThinkStripper:
    """Belt and braces: even with think=False, a reasoning trace (<think>…</think>) must never reach a student."""

    def __init__(self) -> None:
        self.buf, self.inside = "", False

    def feed(self, piece: str | None) -> str:
        if not piece:
            return ""
        self.buf += piece
        out = ""
        while self.buf:
            if self.inside:
                i = self.buf.find("</think>")
                if i < 0:
                    self.buf = self.buf[-8:]          # keep a possible partial closing tag
                    return out
                self.buf, self.inside = self.buf[i + 8:].lstrip(), False
                continue
            i = self.buf.find("<think>")
            if i >= 0:
                out += self.buf[:i]; self.buf, self.inside = self.buf[i + 7:], True
                continue
            keep = next((k for k in range(min(6, len(self.buf)), 0, -1) if "<think>".startswith(self.buf[-k:])), 0)   # partial "<thi"
            out += self.buf[: len(self.buf) - keep]; self.buf = self.buf[len(self.buf) - keep:]
            break
        return out


    def flush(self) -> str:
        out, self.buf = ("" if self.inside else self.buf), ""
        return out


class OllamaInferenceAdapter:
    def __init__(self, base_url: str, timeout_s: float, keep_alive: str = "-1", num_ctx: int = 4096):
        self.keep_alive = keep_alive
        self.num_ctx = num_ctx
        self.base = base_url.rstrip("/")
        self.timeout = httpx.Timeout(timeout_s, connect=3.0)

    async def available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(2.0)) as c:
                return (await c.get(f"{self.base}/api/version")).status_code == 200
        except httpx.HTTPError:
            return False

    async def warm(self, tutor: str, safety: str, tutor_system: str, triage_messages: list[dict]) -> dict[str, float]:
        """Load the models and prime the shared prompt prefixes, so the first student never pays for a cold start.

        Runs the same three request shapes real traffic uses (tutor system prompt, safety classifier, safeguarding triage);
        the runtime keeps their KV prefixes and later requests only process the new tail. Fail-soft.
        """
        took: dict[str, float] = {}
        jobs = {"safety": (safety, [{"role": "user", "content": "How do I write a loop?"}]),
                "triage": (tutor, triage_messages),
                "tutor": (tutor, [{"role": "system", "content": tutor_system}, {"role": "user", "content": "Hello"}])}
        for name, (model, msgs) in jobs.items():
            t0 = time.monotonic()
            try:
                await self.chat(model, msgs, max_tokens=1)
                took[name] = round(time.monotonic() - t0, 1)
            except InferenceError:
                took[name] = -1.0
        return took

    async def models(self) -> list[str]:
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(3.0)) as c:
                r = await c.get(f"{self.base}/api/tags")
                return [m["name"] for m in r.json().get("models", [])]
        except (httpx.HTTPError, ValueError):
            return []

    def _body(self, model: str, messages: list[dict], stream: bool, max_tokens: int, temperature: float) -> dict:
        # think=False: never let a reasoning model spend seconds on hidden thoughts before the first visible word.
        return {"model": model, "messages": messages, "stream": stream, "keep_alive": _keep_alive(self.keep_alive), "think": False,
                "options": {"num_predict": max_tokens, "temperature": temperature, "num_ctx": self.num_ctx}}

    async def stream_chat(self, model: str, messages: list[dict], *, max_tokens: int = 400,
                          temperature: float = 0.3) -> AsyncIterator[str]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as c:
                async with c.stream("POST", f"{self.base}/api/chat",
                                    json=self._body(model, messages, True, max_tokens, temperature)) as r:
                    if r.status_code != 200:
                        raise InferenceError(f"runtime returned {r.status_code}")
                    strip = _ThinkStripper()
                    async for line in r.aiter_lines():
                        if not line:
                            continue
                        d = json.loads(line)
                        if d.get("error"):
                            raise InferenceError(str(d["error"])[:120])
                        if piece := strip.feed(d.get("message", {}).get("content")):
                            yield piece
                        if d.get("done"):
                            if tail := strip.flush():
                                yield tail
                            return
        except httpx.HTTPError as e:
            raise InferenceError(type(e).__name__) from e

    async def chat(self, model: str, messages: list[dict], *, max_tokens: int = 200, temperature: float = 0.0) -> str:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as c:
                r = await c.post(f"{self.base}/api/chat", json=self._body(model, messages, False, max_tokens, temperature))
                if r.status_code != 200:
                    raise InferenceError(f"runtime returned {r.status_code}")
                return _THINK.sub("", r.json().get("message", {}).get("content", "")).strip()
        except httpx.HTTPError as e:
            raise InferenceError(type(e).__name__) from e


class StubInferenceAdapter:
    """Deterministic, offline. Answers from the grounding text it is given, so the whole pipeline is testable.

    Tests can set `next_reply` to force a specific model output (for example, one that leaks an answer)
    to prove the output checks catch it.
    """

    def __init__(self) -> None:
        self.next_reply: str | None = None
        self.calls: list[dict] = []

    async def available(self) -> bool:
        return True

    async def models(self) -> list[str]:
        return ["stub"]

    def _reply(self, messages: list[dict]) -> str:
        if self.next_reply is not None:
            r, self.next_reply = self.next_reply, None
            return r
        sys = next((m["content"] for m in messages if m["role"] == "system"), "")
        m = re.search(r"\[(?P<label>[^\]]+)\]\s*(?P<text>[^\n]+)", sys)
        if m:
            return f"Here is a simple way to think about it. {m.group('text')[:220]} (From {m.group('label')})"
        return "Good question. Let's take it one step at a time. What have you tried so far?"

    async def stream_chat(self, model: str, messages: list[dict], *, max_tokens: int = 400,
                          temperature: float = 0.3) -> AsyncIterator[str]:
        self.calls.append({"model": model, "messages": messages})
        slow = "[slow]" in next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")     # lets a browser test press Stop mid-answer
        for w in re.findall(r"\S+\s*", self._reply(messages)):
            if slow:
                await asyncio.sleep(0.25)
            yield w

    async def chat(self, model: str, messages: list[dict], *, max_tokens: int = 200, temperature: float = 0.0) -> str:
        self.calls.append({"model": model, "messages": messages})
        return "safe"


_adapter: InferenceAdapter | None = None


def get_adapter() -> InferenceAdapter:
    global _adapter
    if _adapter is None:
        s = get_settings()
        _adapter = StubInferenceAdapter() if s.inference_backend == "stub" else OllamaInferenceAdapter(s.ollama_url, s.inference_timeout_s, s.keep_alive, s.tutor_num_ctx)
    return _adapter


def set_adapter(a: InferenceAdapter | None) -> None:
    global _adapter
    _adapter = a
