"""AI Lesson Builder (docs/17): the local model drafts a lesson, the teacher edits and approves it, then it appears for
students in the 'From Your Teachers' course. Nothing is sent off the device. A draft is never shown to students until a
teacher publishes it, and every published word passes the safety rules first."""
from __future__ import annotations

import json
import re
import secrets

import httpx
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..deps import Ctx, err
from ..grades import grade_label
from ..models import Course, CustomLesson, Lesson, now
from ..people import audit
from ..permissions import require_perm
from ..safety import rules
from ..tutor.adapters import InferenceError, OllamaInferenceAdapter, StubInferenceAdapter, get_adapter

router = APIRouter(prefix="/api/teacher/lessons", tags=["lesson-builder"])
teacher = require_perm("teaching")
COURSE_ID, COURSE_TITLE = "teacher-lessons", "From Your Teachers"

PROMPT = """You write short school lessons for {grade} students. Topic: {topic}.{notes}
Reply with ONLY a JSON object, no other text, in this shape:
{{"title": "...", "objective": "By the end of this lesson, you will be able to ...",
 "sections": [{{"title": "...", "text": "..."}}, {{"title": "...", "text": "..."}}, {{"title": "...", "text": "..."}}],
 "check_questions": [{{"prompt": "...", "options": ["...", "...", "...", "..."], "answer_index": 0, "explanation": "..."}}, ... three questions]}}
Rules: 3 or 4 sections, each 2-4 sentences in plain words for that grade. Exactly 3 multiple-choice questions with 4 options each;
answer_index is the 0-based index of the right option; vary which option is right. Facts must be correct. No names of real
children, no links."""


class Section(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    text: str = Field(min_length=1, max_length=1500)


class CheckQ(BaseModel):
    prompt: str = Field(min_length=1, max_length=400)
    options: list[str] = Field(min_length=2, max_length=5)
    answer_index: int = Field(ge=0)
    explanation: str = Field(default="", max_length=500)

    @field_validator("options")
    @classmethod
    def _opts(cls, v):
        v = [o.strip() for o in v]
        if any(not o or len(o) > 200 for o in v):
            raise ValueError("Every option needs some text (under 200 characters).")
        return v


class Draft(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str = Field(min_length=1, max_length=120)
    objective: str = Field(min_length=1, max_length=400)
    sections: list[Section] = Field(min_length=1, max_length=8)
    check_questions: list[CheckQ] = Field(min_length=1, max_length=6)

    @field_validator("check_questions")
    @classmethod
    def _answers(cls, v):
        for q in v:
            if q.answer_index >= len(q.options):
                raise ValueError("Each question's right answer must be one of its options.")
        return v


def _sample(topic: str) -> dict:
    """What the offline test backend drafts (the real model is used on a school's device)."""
    t = topic.strip().rstrip(".")
    return {"title": t[:120], "objective": f"By the end of this lesson, you will be able to explain {t.lower()} in your own words.",
            "sections": [{"title": f"What is {t.lower()}?", "text": f"This lesson introduces {t.lower()}. Read each part, then try the questions."},
                         {"title": "An example", "text": "Look at a simple example and say what you notice."},
                         {"title": "Why it matters", "text": "Think of one place you could see this in everyday life."}],
            "check_questions": [{"prompt": f"Which is the best first step to learn about {t.lower()}?", "options": ["Read the lesson", "Skip it", "Guess", "Close the page"], "answer_index": 0, "explanation": "Reading first gives you the ideas you need."},
                                {"prompt": "What should you do when you are stuck?", "options": ["Give up", "Re-read and ask for a hint", "Copy a friend", "Close the app"], "answer_index": 1, "explanation": "Re-reading and asking for a hint helps you learn."},
                                {"prompt": "How do you know you understand?", "options": ["You can explain it in your own words", "You read it once", "You remember the title", "You clicked fast"], "answer_index": 0, "explanation": "Explaining in your own words shows real understanding."}]}


def _json_in(text: str) -> dict | None:
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def _unsafe(d: Draft) -> str | None:
    """Every word a student will read goes through the same rules as tutor replies."""
    texts = [d.title, d.objective, *[x for s in d.sections for x in (s.title, s.text)], *[x for q in d.check_questions for x in (q.prompt, q.explanation, *q.options)]]
    for t in texts:
        if hit := rules.scan(t):
            return hit.category
    return None


class DraftIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    topic: str = Field(min_length=2, max_length=160)
    grade: int = Field(ge=0, le=12)
    notes: str = Field(default="", max_length=600)


_jobs: dict[str, dict] = {}    # drafting takes a minute or two on a school box: the page asks again until it is done


async def _write(body: DraftIn) -> dict:
    adapter = get_adapter()
    if isinstance(adapter, StubInferenceAdapter):
        raw = _sample(body.topic)
    else:
        s = get_settings()
        slow = OllamaInferenceAdapter(s.ollama_url, 300, s.keep_alive, s.tutor_num_ctx)
        prompt = PROMPT.format(grade=grade_label(body.grade), topic=body.topic, notes=f" Teacher's notes: {body.notes}" if body.notes.strip() else "")
        raw = None
        for _ in range(2):
            try:
                text = await slow.chat(s.tutor_model, [{"role": "user", "content": prompt}], max_tokens=1400, temperature=0.4)
            except (InferenceError, httpx.HTTPError):
                return {"state": "failed", "message": "The local AI is busy or not running. Try again in a minute."}
            if (raw := _json_in(text)) is not None:
                try:
                    Draft.model_validate(raw)
                    break
                except ValueError:
                    raw = None
        if raw is None:
            return {"state": "failed", "message": "The AI couldn't draft that lesson. Try a shorter, simpler topic."}
    d = Draft.model_validate(raw)
    return {"state": "done", "draft": d.model_dump(), "flag": _unsafe(d), "note": "Check every fact and answer before you publish. The AI can make mistakes."}


@router.post("/draft")
async def draft(body: DraftIn, request: Request, ctx: Ctx = Depends(teacher)):
    """Starts a draft and returns its id; GET /draft/{id} until state is done (or failed)."""
    import asyncio
    if hit := rules.scan(body.topic + " " + body.notes):
        raise err(400, "policy_denied", f"That topic can't be drafted here ({hit.category}). Choose a school topic.")
    from .. import demosite
    if get_settings().demo_mode and not demosite.hit("lesson-draft", str(request.scope.get("state", {}).get("demo_visitor") or ctx.user.id), 3):
        raise err(429, "busy", "The demo allows three AI drafts an hour. Try again later, or write the lesson yourself.")
    if sum(1 for j in _jobs.values() if j["state"] == "working") >= 2:
        raise err(429, "busy", "Two lessons are already being drafted. Try again when one finishes.")
    jid = secrets.token_hex(8)
    _jobs[jid] = {"state": "working", "owner": ctx.user.id}

    async def run():
        try:
            _jobs[jid] = {**await _write(body), "owner": ctx.user.id}
        except Exception:  # noqa: BLE001 - never leave a job spinning
            _jobs[jid] = {"state": "failed", "message": "Something went wrong while drafting. Try again.", "owner": ctx.user.id}
    task = asyncio.create_task(run())
    _jobs[jid]["task"] = task
    if isinstance(get_adapter(), StubInferenceAdapter):
        await task
    return {"id": jid, "state": _jobs[jid]["state"]}


@router.get("/draft/{jid}")
def draft_status(jid: str, ctx: Ctx = Depends(teacher)):
    j = _jobs.get(jid)
    if not j or j["owner"] != ctx.user.id:
        raise err(404, "not_found", "That draft isn't here.")
    out = {k: v for k, v in j.items() if k not in ("owner", "task")}
    if j["state"] != "working":
        _jobs.pop(jid, None)
    return out


class SaveIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    grade: int | None = Field(default=None, ge=0, le=12)
    lesson: Draft
    publish: bool = False


def _pack(lid: str, d: Draft, number: int) -> dict:
    cqs = [{"id": f"cq{i}", "prompt": q.prompt, "code": None, "options": q.options, "answer_index": q.answer_index,
            "explanation": q.explanation or "That's right.", "misconception": {}} for i, q in enumerate(d.check_questions, start=1)]
    return {"id": lid, "course_id": COURSE_ID, "title": d.title, "module": "Teacher lessons", "lesson_number": number, "objective": d.objective, "xp_on_complete": 50,
            "sections": [{"id": f"s{i}", "title": s.title, "text": s.text} for i, s in enumerate(d.sections, start=1)],
            "examples": [], "diagram": None, "try_it": None, "check_questions": cqs, "activities": ["read", *[q["id"] for q in cqs]]}


def _row(c: CustomLesson) -> dict:
    return {"id": c.id, "title": c.title, "grade": c.grade, "grade_label": grade_label(c.grade), "status": c.status, "updated_at": c.updated_at.isoformat(),
            "lesson": {"title": c.pack["title"], "objective": c.pack["objective"], "sections": [{"title": s["title"], "text": s["text"]} for s in c.pack["sections"]],
                       "check_questions": [{k: q[k] for k in ("prompt", "options", "answer_index", "explanation")} for q in c.pack["check_questions"]]}}


def _publish(db: Session, c: CustomLesson) -> None:
    if not db.get(Course, COURSE_ID):
        pos = (db.scalar(select(func.max(Course.position))) or 0) + 1
        db.add(Course(id=COURSE_ID, title=COURSE_TITLE, description="Lessons your teachers made for your class.", icon="book", accent="blue", position=pos))
        db.flush()
    l = db.get(Lesson, c.id)
    if l is None:
        n = (db.scalar(select(func.max(Lesson.number)).where(Lesson.course_id == COURSE_ID)) or 0) + 1
        db.add(Lesson(id=c.id, course_id=COURSE_ID, module="Teacher lessons", number=n, title=c.title, available=True))
    else:
        l.title, l.available = c.title, True
    c.status = "published"


@router.post("", status_code=201)
def save(body: SaveIn, ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    if body.publish and (cat := _unsafe(body.lesson)):
        raise err(400, "policy_denied", f"Some text didn't pass the safety check ({cat}). Edit it, then publish.")
    lid = f"tl-{re.sub(r'[^a-z0-9]+', '-', body.lesson.title.lower()).strip('-')[:40]}-{secrets.token_hex(3)}"
    c = CustomLesson(id=lid, school_id=ctx.user.school_id, teacher_id=ctx.user.id, title=body.lesson.title, grade=body.grade, pack=_pack(lid, body.lesson, 0))
    db.add(c)
    db.flush()
    if body.publish:
        _publish(db, c)
        c.pack = {**c.pack, "lesson_number": db.get(Lesson, lid).number}
    audit(db, ctx.user, "lesson.publish" if body.publish else "lesson.save", f"lesson:{lid}", body.lesson.title)
    db.commit()
    return _row(c)


@router.get("")
def mine(ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    return {"lessons": [_row(c) for c in db.scalars(select(CustomLesson).where(CustomLesson.school_id == ctx.user.school_id).order_by(CustomLesson.updated_at.desc()))]}


@router.put("/{lid}")
def update(lid: str, body: SaveIn, ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    c = db.get(CustomLesson, lid)
    if not c or c.school_id != ctx.user.school_id:
        raise err(404, "not_found", "That lesson isn't here.")
    if (body.publish or c.status == "published") and (cat := _unsafe(body.lesson)):
        raise err(400, "policy_denied", f"Some text didn't pass the safety check ({cat}). Edit it, then publish.")
    c.title, c.grade, c.updated_at = body.lesson.title, body.grade, now()
    c.pack = _pack(c.id, body.lesson, c.pack.get("lesson_number", 0))
    if body.publish or c.status == "published":
        _publish(db, c)
        c.pack = {**c.pack, "lesson_number": db.get(Lesson, c.id).number}
    audit(db, ctx.user, "lesson.edit", f"lesson:{lid}", c.title)
    db.commit()
    return _row(c)


@router.post("/{lid}/unpublish")
def unpublish(lid: str, ctx: Ctx = Depends(teacher), db: Session = Depends(get_db)):
    c = db.get(CustomLesson, lid)
    if not c or c.school_id != ctx.user.school_id:
        raise err(404, "not_found", "That lesson isn't here.")
    c.status = "draft"
    if l := db.get(Lesson, lid):
        l.available = False
    audit(db, ctx.user, "lesson.unpublish", f"lesson:{lid}", c.title)
    db.commit()
    return _row(c)
