"""Per-institution provisioning for a customer box (docs/edu54/INSTALL-RUNBOOK.md Phase 9). Safe to re-run.

    python -m umanah_api.provision <school.yaml> [--secrets-dir DIR]

Creates the institution, its admin and its safety contact(s) with one-time passwords that must be changed at first sign-in,
and the course catalog without any demo data. Prints a provisioning report (JSON, no passwords). The one-time passwords go
only to a 0600 first-login sheet in the secrets folder, to be printed and sealed, never emailed in plain text.
"""
from __future__ import annotations

import json
import os
import re
import secrets
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from .content import catalog
from .models import Course, Lesson, SafetyContact, School, User
from .people import slug_username
from .security import hash_password

EDITIONS = ("k12", "university")
_ID = re.compile(r"^[a-z0-9][a-z0-9-]{1,40}$")


def validate(spec: dict[str, Any]) -> list[str]:
    """Problems with an order file, in plain words (empty when it can be applied)."""
    p = []
    if not _ID.match(str(spec.get("school_id", ""))):
        p.append("school_id must be lower-case letters, digits and dashes")
    if not str(spec.get("institution_name", "")).strip():
        p.append("institution_name is missing")
    if spec.get("edition") not in EDITIONS:
        p.append("edition must be k12 or university (one per box)")
    if [lang for lang in spec.get("languages", ["en"]) if lang != "en"]:
        p.append("only English is available for now")
    admin = spec.get("admin") or {}
    if not str(admin.get("name", "")).strip():
        p.append("admin.name is missing")
    contacts = [c for c in spec.get("safety_contacts") or [] if str(c.get("name", "")).strip()]
    if not contacts:
        p.append("at least one safety contact with a name is required")
    return p


def add_catalog(db: Session) -> int:
    n = 0
    for c in catalog()["courses"]:
        if not db.get(Course, c["id"]):
            db.add(Course(id=c["id"], title=c["title"], description=c["description"], icon=c["icon"], accent=c["accent"], position=c["position"]))
            db.flush()
        for i, lesson in enumerate(c["lessons"], start=1):
            lid = lesson.get("id") or f"{c['id']}-l{i}"
            if not db.get(Lesson, lid):
                db.add(Lesson(id=lid, course_id=c["id"], module=lesson["module"], number=i, title=lesson["title"], available=bool(lesson.get("available"))))
                n += 1
    db.flush()
    return n


def provision(db: Session, spec: dict[str, Any], secrets_dir: Path | None = None) -> dict[str, Any]:
    problems = validate(spec)
    if problems:
        raise ValueError("; ".join(problems))
    sid = spec["school_id"]
    display = (spec.get("branding") or {}).get("display") or f"EDU54 · {spec['institution_name']}"
    settings = {"country": spec.get("country"), "edition": spec["edition"], "display": display, "languages": spec.get("languages", ["en"]),
                "expected_students": spec.get("expected_students"), "hardware_tier": spec.get("hardware_tier"),
                "accent_color": (spec.get("branding") or {}).get("accent_color")}
    school = db.scalar(select(School).where(School.local_slug == sid))
    created, first_login = [], []
    if school is None:
        school = School(name=spec["institution_name"], local_slug=sid, settings=settings)
        db.add(school)
        db.flush()
    else:
        school.name, school.settings = spec["institution_name"], {**(school.settings or {}), **settings}

    def person(name: str, role: str, title: str | None, email: str | None) -> User:
        existing = db.scalar(select(User).where(User.school_id == school.id, User.display_name == name, User.role == role))
        if existing:
            return existing
        pw = secrets.token_urlsafe(12)
        u = User(school_id=school.id, role=role, display_name=name, username=slug_username(db, name), title=title,
                 password_hash=hash_password(pw), must_change_password=True)
        db.add(u)
        db.flush()
        created.append({"username": u.username, "name": name, "role": role})
        first_login.append((u.username, pw, name, role, email or ""))
        return u

    admin_title = "Institution Admin" if spec["edition"] == "university" else "School Admin"
    person(spec["admin"]["name"], "owner", admin_title, spec["admin"].get("email"))
    for i, c in enumerate(c for c in spec["safety_contacts"] if str(c.get("name", "")).strip()):
        u = person(c["name"], "counselor", c.get("title") or "designated safety contact", c.get("email"))
        if not db.get(SafetyContact, u.id):
            db.add(SafetyContact(user_id=u.id, school_id=school.id, is_primary=i == 0))
    lessons = add_catalog(db)
    db.commit()

    sheet = None
    if first_login and secrets_dir:
        secrets_dir.mkdir(parents=True, exist_ok=True)
        sheet = secrets_dir / f"first-login-{sid}.txt"
        with open(sheet, "a", encoding="utf-8") as f:
            f.write(f"# {display}: one-time sign-in details ({datetime.now(UTC):%Y-%m-%d %H:%M} UTC). Print, seal, hand over. Never email.\n")
            f.write("# Everyone must choose a new password at first sign-in.\n")
            for username, pw, name, role, email in first_login:
                f.write(f"{name} ({role}{', ' + email if email else ''})\n  username: {username}\n  one-time password: {pw}\n")
        os.chmod(sheet, 0o600)
    return {"school_id": sid, "institution": spec["institution_name"], "display": display, "edition": spec["edition"],
            "created_accounts": created, "catalog_lessons_added": lessons, "first_login_sheet": str(sheet) if sheet else None,
            "at": datetime.now(UTC).isoformat(timespec="seconds")}


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    spec = yaml.safe_load(Path(argv[0]).read_text(encoding="utf-8"))
    sdir = Path(argv[argv.index("--secrets-dir") + 1]) if "--secrets-dir" in argv else None
    from .config import get_settings
    from .db import init_engine, session_scope
    from .main import prepare_database
    s = get_settings()
    if s.edition and s.edition != spec.get("edition"):
        print(f"this install runs the {s.edition} edition; the order is for {spec.get('edition')}", file=sys.stderr)
        return 1
    s.data_dir.mkdir(parents=True, exist_ok=True)
    init_engine(f"sqlite:///{s.db_path}")
    prepare_database()
    with session_scope() as db:
        try:
            report = provision(db, spec, sdir)
        except ValueError as e:
            print(f"cannot provision: {e}", file=sys.stderr)
            return 1
    print(json.dumps(report, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
