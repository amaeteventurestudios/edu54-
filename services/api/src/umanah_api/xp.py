"""XP, levels, badges and streaks. Idempotent and auditable (docs/15). Never rewards AI usage."""
from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .content import gamification
from .models import ActivityDay, AuditLog, UserBadge, XpEvent


def award_xp(db: Session, user_id: int, key: str, kind: str, amount: int,
             actor_id: int | None = None, reason: str | None = None) -> bool:
    """Returns True only the first time `key` is seen; replays are no-ops."""
    if db.scalar(select(XpEvent.id).where(XpEvent.key == key)):
        return False
    db.add(XpEvent(user_id=user_id, key=key, kind=kind, amount=amount, actor_id=actor_id, reason=reason))
    if actor_id is not None:
        db.add(AuditLog(actor_id=actor_id, action="xp.adjust", target=f"user:{user_id}", reason=reason))
    try:
        db.flush()
    except IntegrityError:  # lost a race with a concurrent replay
        db.rollback()
        return False
    return True


def total_xp(db: Session, user_id: int) -> int:
    return int(db.scalar(select(func.coalesce(func.sum(XpEvent.amount), 0)).where(XpEvent.user_id == user_id)) or 0)


def level_info(xp: int) -> dict:
    levels = gamification()["levels"]
    cur = max((l for l in levels if xp >= l["min_xp"]), key=lambda l: l["min_xp"])
    nxt = next((l for l in sorted(levels, key=lambda l: l["min_xp"]) if l["min_xp"] > cur["min_xp"]), None)
    # docs/05: "Level 4 Builder, 1,420/2,000 XP" — the bar shows XP toward the next level's threshold, from zero.
    pct = min(100, round(100 * xp / nxt["min_xp"])) if nxt else 100
    return {"level": cur["level"], "name": cur["name"], "xp": xp, "next_level_xp": nxt["min_xp"] if nxt else None,
            "next_level_name": nxt["name"] if nxt else None, "percent": pct}


def award_badge(db: Session, user_id: int, badge_id: str) -> bool:
    if db.get(UserBadge, (user_id, badge_id)):
        return False
    db.add(UserBadge(user_id=user_id, badge_id=badge_id))
    db.flush()
    return True


def is_school_day(d: date) -> bool:
    return d.isoweekday() in gamification()["school_days"]


def touch_activity(db: Session, user_id: int, when: datetime | None = None) -> None:
    d = (when or datetime.now()).date()
    if not is_school_day(d):
        return
    if not db.get(ActivityDay, (user_id, d.isoformat())):
        db.add(ActivityDay(user_id=user_id, day=d.isoformat()))
        db.flush()


def streak_days(db: Session, user_id: int, today: date | None = None) -> int:
    """Consecutive school days with activity, ending today or the last school day. Private to the student."""
    today = today or date.today()
    days = {r for r in db.scalars(select(ActivityDay.day).where(ActivityDay.user_id == user_id))}
    d, n = today, 0
    while not is_school_day(d):
        d -= timedelta(days=1)
    if d.isoformat() not in days:          # not yet active today: streak is still alive from the previous school day
        d -= timedelta(days=1)
        while not is_school_day(d):
            d -= timedelta(days=1)
    while d.isoformat() in days:
        n += 1
        d -= timedelta(days=1)
        while not is_school_day(d):
            d -= timedelta(days=1)
    return n
