"""Chat orchestration: the whole request pipeline of docs/11 and 41/42/43, as an event stream.

  auth → mode (server) → input safety → [answer-seeking? serve the next hint, no model] → retrieval → prompt
       → queue slot → stream from the model → output safety + leak check → persist → done
"""
from __future__ import annotations

import asyncio
import re
import time
from collections import deque
from collections.abc import AsyncIterator
from datetime import timedelta

from sqlalchemy import select

from .. import hints as hints_mod
from ..config import get_settings
from ..db import new_session
from ..models import Conversation, Message, Question, SafetyAlert, SafetyContact, SafetyEvent, School, User, now
from ..safety import pipeline as safety
from ..safety import responses
from . import followups, leakcheck, numbers, prompts, retrieval, style, titles
from .adapters import InferenceError, get_adapter
from .modes import ModeInfo

ANSWER_SEEKING = re.compile(
    r"(just|simply|please|pls|plz)?\s*(give|tell|show|write|type|send|reveal|share|spell out)\s+(me\s+)?(the\s+)?(final\s+|full\s+|correct\s+|whole\s+|exact\s+)?(answers?|solutions?|result)"
    r"|what('?s| is| are)\s+(the\s+)?(final\s+|correct\s+|right\s+)?(answers?|solutions?)"
    r"|(is|are)\s+[\w./\-\s,]{1,30}\s+(right|correct|the answer)\b|is that (right|correct)"
    r"|\b(confirm|check|verify|validate|tell me|let me know|see|know)\b.{0,30}\b(if|whether)\b.{0,40}\b(right|correct|wrong|incorrect|true|good)\b"
    r"|\b(right|correct|incorrect|wrong)\s*\?\s*$"
    r"|(confirm|check|verify|validate)\b.{0,40}\b(answer|it|this|that|mine|my)\b|am i (right|correct)|did i (get|do) (it|this)"
    r"|(teacher|mr\.?|ms\.?|mrs\.?|admin|principal|developer|system)\b.{0,50}\b(said|says|told|allow(s|ed)?|permission|ok(ay)?|fine|changed|unlock|enabled?)\b"
    r"|(ignore|forget|disregard|override|bypass|jailbreak)\b.{0,30}\b(rules?|instructions?|previous|above|policy|limits?)"
    r"|(pretend|act|roleplay|role-play|imagine)\b.{0,40}\b(teacher|admin|no rules|without (rules|limits)|unrestricted|dan\b)"
    r"|(teacher|answer[- ]key|answer|solution)\s+mode|switch (to )?(teacher|answer|solution)"
    r"|(solve|do|finish|complete|answer)\s+(it|this|that|the (question|problem|homework|assignment|worksheet))\s+(for me)?"
    r"|do my homework|solve (this|these|the) for me|what should i (write|put|type)|what do i (write|put|type)",
    re.I,
)

_users_lock: dict[int, asyncio.Lock] = {}


class Slots:
    """docs/43: one request in flight per student, a global cap on model slots, and a visible queue."""

    def __init__(self, n: int):
        self.n = n
        self.running = 0
        self.waiting: deque[object] = deque()
        self.avg_s = 8.0

    async def acquire(self, user_id: int) -> AsyncIterator[dict]:
        lock = _users_lock.setdefault(user_id, asyncio.Lock())
        await lock.acquire()                    # a second press from the same student waits for the first
        ticket = object()
        self.waiting.append(ticket)
        try:
            while not (self.running < self.n and self.waiting[0] is ticket):
                pos = list(self.waiting).index(ticket) + (1 if self.running >= self.n else 0)
                yield {"type": "queue", "position": max(1, pos), "eta_s": int(max(1, pos) * self.avg_s)}
                await asyncio.sleep(0.4)
            self.running += 1
        except BaseException:
            lock.release()
            raise
        finally:
            self.waiting.remove(ticket)
        yield {"type": "go"}

    def release(self, user_id: int, took_s: float) -> None:
        self.running = max(0, self.running - 1)
        self.avg_s = 0.7 * self.avg_s + 0.3 * max(1.0, took_s)
        if (lk := _users_lock.get(user_id)) and lk.locked():
            lk.release()


_slots: Slots | None = None


def slots() -> Slots:
    global _slots
    if _slots is None:
        _slots = Slots(get_settings().max_parallel_inference)
    return _slots


def reset_slots() -> None:
    global _slots
    _slots = None
    _users_lock.clear()


def _contact(db, school_id: int) -> tuple[User | None, str | None]:
    row = db.scalars(select(SafetyContact).where(SafetyContact.school_id == school_id).order_by(SafetyContact.is_primary.desc())).first()
    if not row:
        return None, None
    u = db.get(User, row.user_id)
    return u, (u.title if u else None) or row.location


def _sentences(buf: str) -> tuple[list[str], str]:
    """Split off everything up to the last sentence or paragraph end, keeping the whitespace: Markdown needs its line breaks."""
    cut = 0
    for m in re.finditer(r"(?<=[.!?…])\s+|\n{2,}", buf):
        cut = m.end()
    return ([buf[:cut]] if cut else []), buf[cut:]


async def run_chat(user_id: int, message: str, mode: ModeInfo, conversation_id: int | None) -> AsyncIterator[dict]:
    s = get_settings()
    adapter = get_adapter()
    db = new_session()
    t0 = time.monotonic()
    try:
        user = db.get(User, user_id)
        conv = db.get(Conversation, conversation_id) if conversation_id else None
        if conv is not None and (conv.user_id != user_id or conv.mode != mode.mode):
            conv = None
        if conv is None:
            conv = Conversation(user_id=user_id, mode=mode.mode, context_type=("assignment" if mode.assignment else "lesson" if mode.lesson_id else "experiment" if mode.experiment else None),
                                context_id=(mode.assignment.id if mode.assignment else mode.lesson_id or (mode.experiment or {}).get("id")),
                                visible_to_teacher=mode.teacher_visible, expires_at=now() + timedelta(days=s.chat_retention_days),
                                title=titles.make_title(message))
            db.add(conv)
            db.commit()       # never hold SQLite's write lock across a yield or a model call (docs/43: 10 students at once)
        yield {"type": "meta", "conversation_id": conv.id, "mode": mode.mode, "badge": mode.badge, "locked": mode.locked, "title": conv.title}
        school = db.get(School, user.school_id)
        emoji_ok = bool((school.settings or {}).get("tutor_emoji")) and mode.mode not in ("homework", "assessment")
        sfilter = style.StyleFilter(emoji_ok)

        # ---- 1. input screen -------------------------------------------------------------------------
        decision = await safety.screen(message, direction="input")
        umsg = Message(conversation_id=conv.id, role="user", content=message, safety_result=decision.as_json())
        db.add(umsg)
        db.commit()
        if not decision.allowed:
            conv.title = titles.SUPPORT_TITLE          # never show a private message in the chat list
            contact, ctitle = _contact(db, user.school_id)
            if decision.action in ("alert", "support"):
                text = (responses.distress_response(contact.display_name if contact else None, ctitle) if decision.category == "distress"
                        else responses.support_response(decision.category, contact.display_name if contact else None, ctitle))
            else:
                text = responses.REDIRECTS.get(decision.category, "I can't help with that here. Let's get back to learning.")
            ev = SafetyEvent(user_id=user_id, category=decision.category, severity=decision.severity, action=decision.action)
            db.add(ev)
            db.flush()
            if decision.action == "alert":
                db.add(SafetyAlert(event_id=ev.id, school_id=user.school_id, student_id=user_id, excerpt=message[:1000], reply=text))
            reply = Message(conversation_id=conv.id, role="assistant", content=text, safety_result={**decision.as_json(), "fixed_response": True})
            db.add(reply)
            db.commit()
            yield {"type": "safety", "action": decision.action, "category": decision.category, "text": text,
                   "contact": ({"name": contact.display_name, "title": ctitle} if contact and decision.action in ("alert", "support") else None),
                   "resources": responses.resources() if decision.action in ("alert",) else []}
            yield {"type": "done", "message_id": reply.id}
            return

        # ---- 2. homework/assessment: answer-seeking is served by code, not by the model -----------------
        qid = mode.question_id
        if mode.mode == "assessment":
            text = ("The tutor can't help with assessment questions. If something about the instructions is unclear, "
                    f"ask {mode.set_by or 'your teacher'}.")
            reply = Message(conversation_id=conv.id, role="assistant", content=text, safety_result={"action": "policy", "mode": "assessment"})
            db.add(reply)
            db.commit()
            yield {"type": "token", "text": text}
            yield {"type": "done", "message_id": reply.id}
            return
        if mode.mode == "homework" and mode.assignment is not None:
            if qid is None:
                first = db.scalars(select(Question.id).where(Question.assignment_id == mode.assignment.id).order_by(hints_mod.Question.index)).first()
                qid = first
            if ANSWER_SEEKING.search(message) and qid:
                step, total, text = hints_mod.serve_next_hint(db, user_id, qid)
                if text is None:
                    text = ("I can only give hints in homework, and I've shared all the hints for this question. "
                            f"Try the steps again, or ask {mode.set_by or 'your teacher'} for help.")
                    head = ""
                else:
                    head = f"I can only give hints in homework — here's hint {step} of {total}: "
                body = head + text
                reply = Message(conversation_id=conv.id, role="assistant", content=body, safety_result={"action": "hint", "step": step})
                db.add(reply)
                db.commit()
                yield {"type": "token", "text": body}
                yield {"type": "hint", "step": step, "total": total}
                yield {"type": "suggestions", "items": followups.suggest(body, mode.mode)}
                yield {"type": "done", "message_id": reply.id}
                return

        # ---- 3. retrieval + prompt ---------------------------------------------------------------------
        prior = [m.content for m in conv.messages if m.role == "user" and m.id != umsg.id]
        sources, covered = retrieval.lesson_sources(mode.lesson_id, message, prior) if mode.mode != "general" else ([], True)
        hint = hints_mod.current_hint(db, user_id, qid) if (mode.mode == "homework" and qid) else None
        # Rule 5 (docs/42): numbers are computed by code. Never in homework or assessment, where that would do the student's calculation.
        verified = numbers.solve(message) if mode.mode not in ("homework", "assessment") else []
        system = prompts.build_system(mode, sources, covered, hint, s.tutor_max_words, emoji_ok, verified)
        history = [{"role": m.role, "content": m.content} for m in conv.messages if m.id != umsg.id and not (m.safety_result or {}).get("fixed_response")][-6:]
        msgs = [{"role": "system", "content": system}, *history, {"role": "user", "content": message}]
        keyed = hints_mod.keyed_questions(db, mode.assignment.id) if (mode.assignment is not None and mode.mode in ("homework", "assessment")) else []
        strict = mode.mode in ("homework", "assessment")
        citations = [x.label for x in sources[:2]] if mode.mode != "general" else []
        db.commit()

        # ---- 4. queue for a model slot -----------------------------------------------------------------
        sl = slots()
        got_slot = False
        started = time.monotonic()
        try:
            async for ev in sl.acquire(user_id):
                if ev["type"] == "queue":
                    yield ev
                else:
                    got_slot = True
            started = time.monotonic()
            # ---- 5. generate, screening as we go ---------------------------------------------------------
            shown, buf, full = "", "", ""
            replaced = False
            try:
                async for piece in adapter.stream_chat(s.tutor_model, msgs, max_tokens=int(s.tutor_max_words * 2.2)):
                    full += piece
                    buf += piece
                    if strict:
                        continue                        # homework/assessment: hold the whole reply until it is screened
                    done_s, buf = _sentences(buf)
                    for sent in done_s:
                        bad = _sentence_problem(sent)
                        if bad:
                            replaced = True
                            break
                        shown += sent
                        yield {"type": "token", "text": sfilter.feed(sent)}
                    if replaced:
                        break
            except InferenceError:
                text = responses.UNAVAILABLE
                reply = Message(conversation_id=conv.id, role="assistant", content=text, safety_result={"action": "unavailable"})
                db.add(reply)
                db.commit()
                yield {"type": "error", "code": "unavailable", "message": text}
                yield {"type": "done", "message_id": reply.id}
                return
            if not replaced and buf and not strict:
                if not _sentence_problem(buf):
                    shown += buf
                    yield {"type": "token", "text": sfilter.feed(buf)}
                else:
                    replaced = True
            reply_text = full.strip()
            problem: str | None = None
            clean_text = style.clean(reply_text, emoji_ok)
            fixed_text, fixes = numbers.verify(clean_text, message) if mode.mode != "assessment" else (clean_text, [])

            # ---- 6. output screen -------------------------------------------------------------------------
            if not replaced:
                out = await safety.screen(reply_text, direction="output", prompt=message)
                if not out.allowed:
                    problem = f"safety:{out.category}"
                elif strict and (lk := leakcheck.leaks(reply_text, keyed, qid, message)):
                    problem = f"leak:{lk.id}"
            else:
                problem = "safety:sentence"
            if not problem and not strict and not shown.strip() and not fixed_text.strip():
                problem = "empty"                          # the model produced nothing usable: say so instead of storing a blank answer
            if problem or (strict and not reply_text):
                if strict and qid:
                    step, total, htxt = hints_mod.serve_next_hint(db, user_id, qid)
                    final = (f"Here's a hint instead — hint {step} of {total}: {htxt}" if htxt else
                             f"I can only give hints here, and I've shared them all. Ask {mode.set_by or 'your teacher'} for help.")
                else:
                    final = "I couldn't give a good answer to that one. Try asking it a different way, or ask your teacher."
                yield {"type": "replace", "text": final, "reason": problem or "empty"} if not strict else {"type": "token", "text": final}
                stored, safety_result = final, {"action": "replaced", "reason": problem}
            else:
                if fixes:
                    yield {"type": "replace", "text": fixed_text, "reason": "numbers"}
                elif strict:
                    yield {"type": "token", "text": clean_text}
                stored, safety_result = fixed_text, {"action": "allow", **({"numbers_fixed": fixes} if fixes else {})}
            reply = Message(conversation_id=conv.id, role="assistant", content=stored, safety_result=safety_result, citations=citations or None)
            db.add(reply)
            db.commit()
            if citations and not problem:
                yield {"type": "citations", "items": citations}
            yield {"type": "suggestions", "items": followups.suggest(stored, mode.mode) if not problem else []}
            yield {"type": "done", "message_id": reply.id}
        finally:
            if got_slot:
                sl.release(user_id, time.monotonic() - started)
            elif (lk := _users_lock.get(user_id)) and lk.locked():
                lk.release()
    finally:
        db.close()


def _sentence_problem(sentence: str) -> bool:
    """Cheap per-sentence check for streamed replies: any rule hit at all means the reply is not delivered."""
    from ..safety import rules
    return rules.scan(sentence) is not None
