"""Demo-data maintenance (docs/46). One place builds the fictional conversations, so a fresh seed and a cleaned live database agree.

    python -m umanah_api.demo reset-chats     back up the database, delete ALL conversations, safety events and alerts, seed the realistic ones

Load tests and evals never use the demo database: they run on scratch servers (see tools/dev-shots-server.sh) and refuse `instance=demo`.
"""
from __future__ import annotations

import sys
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .demo_chats import JORDAN, OTHERS
from .models import Conversation, Message, SafetyAlert, SafetyEvent, User


def seed_chats(db: Session) -> int:
    """Realistic, deterministic conversations for Jordan and eight classmates. Returns how many were created."""
    today = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    students = list(db.scalars(select(User).where(User.role == "student").order_by(User.id)))
    users = {u.username: u for u in students}
    lead = users.get("jordan") or (students[0] if students else None)          # the demo's lead student (EDU54 names them differently)
    rest = [u for u in students if u is not lead]
    plan = [(lead, c) for c in JORDAN] if lead else []
    for i in range(1, 9):
        u = users.get(f"student{i:02d}") or (rest[i - 1] if "student01" not in users and i <= len(rest) else None)
        if u:
            plan += [(u, OTHERS[(i + k) % len(OTHERS)]) for k in range(2 + i % 2)]
    n = 0
    for user, (mode, ctype, cid, title, days, hour, turns, fb) in plan:
        at = today - timedelta(days=days, hours=today.hour - hour)
        conv = Conversation(user_id=user.id, mode=mode, context_type=ctype, context_id=cid, title=title, visible_to_teacher=mode in ("lesson", "homework"),
                            created_at=at, expires_at=at + timedelta(days=90))
        db.add(conv)
        db.flush()
        for j, (role, text) in enumerate(turns):
            last_reply = role == "assistant" and j == len(turns) - 1
            hint = mode == "homework" and role == "assistant" and "hint" in text.lower()
            db.add(Message(conversation_id=conv.id, role=role, content=text, created_at=at + timedelta(minutes=j),
                           safety_result={"action": "hint"} if hint else ({"action": "allow"} if role == "assistant" else None),
                           citations=["From Lesson 6: Loops"] if (role == "assistant" and ctype == "lesson") else None,
                           feedback=fb if last_reply else None, feedback_at=(at + timedelta(minutes=j + 1)) if (last_reply and fb) else None))
        n += 1
    db.flush()
    return n


def reset_chats(db: Session) -> tuple[int, int]:
    """Delete every conversation (test leftovers included) and re-seed. Returns (deleted, created)."""
    before = len(db.scalars(select(Conversation.id)).all())
    db.execute(delete(SafetyAlert))
    db.execute(delete(SafetyEvent))
    db.execute(delete(Message))
    db.execute(delete(Conversation))
    made = seed_chats(db)
    db.commit()
    return before, made


def main(argv: list[str]) -> int:
    from . import migrate
    from .config import get_settings
    from .db import engine, init_engine, session_scope
    if argv[:1] != ["reset-chats"]:
        print(__doc__)
        return 2
    s = get_settings()
    init_engine(f"sqlite:///{s.db_path}")
    dest = migrate._backup_sqlite(engine(), "demo-reset-chats")
    print("backup:", dest)
    with session_scope() as db:
        print("deleted %d, created %d conversations" % reset_chats(db))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
