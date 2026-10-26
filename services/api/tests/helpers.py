from __future__ import annotations

import json


def chat(client, message: str, context: dict | None = None, conversation_id: int | None = None) -> list[dict]:
    """POST /api/ai/chat and return the parsed server-sent events."""
    body = {"message": message, "context": context or {}}
    if conversation_id:
        body["conversation_id"] = conversation_id
    with client.stream("POST", "/api/ai/chat", json=body) as r:
        assert r.status_code == 200, r.read()
        events = [json.loads(line[6:]) for line in r.iter_lines() if line.startswith("data: ")]
    return events


def text_of(events: list[dict]) -> str:
    out = ""
    for e in events:
        if e["type"] == "token":
            out += e["text"]
        elif e["type"] == "replace":
            out = e["text"]
        elif e["type"] == "safety":
            out = e["text"]
    return out
