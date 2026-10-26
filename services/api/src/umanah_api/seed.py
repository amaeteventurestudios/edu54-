"""Fictional demo data (docs/44): 'Demo Academy', Ms. Williams, Ms. Rivera, Period 3 with 28 students including Jordan Smith.

Every date is generated relative to today; nothing is hard-coded. Runs only when the database is empty.
"""
from __future__ import annotations

import json
import os
import secrets
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .content import assignment_pack, catalog
from .models import (ActivityDay, AnswerKey, Assignment, ClassMember, ClassRoom, Course, Lesson, LessonProgress, Question, QuestionAttempt,
                     Project, QuestionHint, RevisionAttempt, SafetyContact, School, Submission, User, UserBadge, now)
from .security import hash_password
from .xp import award_xp, is_school_day

FIRST = ["Ava", "Liam", "Noah", "Emma", "Maya", "Ethan", "Zoe", "Lucas", "Aria", "Mateo", "Ivy", "Omar", "Nia", "Leo", "Sofia", "Amir",
         "Chloe", "Dev", "Hana", "Kai", "Lena", "Malik", "Nora", "Owen", "Priya", "Quinn", "Ruby"]
LAST = ["Lopez", "Nguyen", "Patel", "Brooks", "Kim", "Diaz", "Cohen", "Hughes", "Ito", "Reyes", "Ford", "Khan", "Sato", "Ellis", "Moreno",
        "Baker", "Shaw", "Ortiz", "Grant", "Hall", "Park", "Silva", "Rowe", "Cruz", "Webb", "Tran", "Bell"]


# EDU54 demo schools (docs/edu54/CLAUDE.md §3): one admin, two teachers or lecturers, six students, one safety contact.
# Fictional pan-African names. Usernames match the AI Lab seed so the demo conversations attach the same way.
EDU54_PEOPLE = {
    "k12": {"teachers": [("mrsadeyemi", "Mrs. Adeyemi", "teacher"), ("mrboateng", "Mr. Boateng", "teacher")],
            "level": "JSS 2",
            "safety": ("mrsotieno", "Mrs. Otieno", "school counselor, Room 4"),
            "students": ["Kofi Mensah", "Amara Okafor", "Zawadi Mwangi", "Tunde Balogun", "Nia Banda", "Sipho Dlamini"],
            "class": ("JSS 2 — Introduction to AI", "Computer Studies", "First Term", "13-15"),
            # one demo learner in each of the other grade bands, so every learner experience can be shown (owner, 2026-09-30)
            "band_demo": [("ama", "Ama Owusu", "Primary 1", "Primary 1 — Discovery", "under13"),
                          ("chidi", "Chidi Eze", "Primary 4", "Primary 4 — Explorers", "under13"),
                          ("fatima", "Fatima Bello", "SSS 2", "SSS 2 — AI and Data", "16plus")]},
    "university": {"teachers": [("drasante", "Dr. Asante", "lecturer"), ("drnjoroge", "Dr. Njoroge", "lecturer")],
                   "level": "Year 1",
                   "safety": ("mrsokonkwo", "Mrs. Okonkwo", "student welfare officer"),
                   "students": ["Kwame Owusu", "Adaeze Nwosu", "Wanjiru Kamau", "Ibrahim Diallo", "Thandiwe Nkosi", "Yaw Darko"],
                   "class": ("CSC 101 — Introduction to Programming and AI", "Computer Science", "First Semester", "16plus")},
}


def add_band_demo(db: Session, school: School, people: dict, teacher: User, make) -> list[str]:
    """The extra demo learners, one class each (K-12 only). Skips any that exist. Returns the usernames created."""
    made = []
    for username, name, level, cname, band in people.get("band_demo", []):
        if db.scalar(select(User.id).where(User.username == username)):
            continue
        u = make(username, name, "student")
        c = ClassRoom(school_id=school.id, teacher_id=teacher.id, name=cname, subject="Computing", term="First Term",
                      settings={"age_band": band, "language": "en", "level": level})
        db.add(c)
        db.flush()
        db.add(ClassMember(class_id=c.id, user_id=u.id))
        made.append(username)
    db.flush()
    return made


def grades_from_levels(db: Session) -> None:
    """EDU54 K-12 classes carry a level ("JSS 2"); a student with no grade yet takes the grade behind their class's level,
    so grade-band features (Practice, widening, the tutor's reading level) see the same band as the Home. Existing grades stay."""
    from .grades import grade_for_level
    for u, c in db.execute(select(User, ClassRoom).join(ClassMember, ClassMember.user_id == User.id).join(ClassRoom, ClassRoom.id == ClassMember.class_id)
                           .where(User.role == "student", User.grade.is_(None)).order_by(ClassRoom.id)):
        if u.grade is None and (g := grade_for_level((c.settings or {}).get("level"))) is not None:
            u.grade = g
    db.flush()


def ensure_edition_demo(db: Session) -> None:
    """A demo database made before grade bands existed gets its class levels and the extra band learners now.
    Their logins are appended to the credentials file. Nothing already there is changed except empty level settings."""
    s = get_settings()
    from .branding import edition
    ed = edition()
    people = EDU54_PEOPLE.get(ed["id"]) if s.brand not in ("", "umanah") else None
    school = db.scalars(select(School).order_by(School.id)).first()
    if not people or not school or school.name not in (ed["demoSchool"], "EDU54 Demo Secondary School"):
        return
    school.name = ed["demoSchool"]              # K-12 now spans Kindergarten to SSS 3: "EDU54 Demo School"
    first = db.scalars(select(ClassRoom).order_by(ClassRoom.id)).first()
    if first and not (first.settings or {}).get("level"):
        first.settings = {**(first.settings or {}), "level": people["level"]}
    teacher = db.scalar(select(User).where(User.username == people["teachers"][-1][0]))
    if not teacher:
        db.commit()
        return
    creds: dict[str, str] = {}

    def make(username: str, name: str, role: str) -> User:
        pw = s.demo_password or secrets.token_urlsafe(9)
        creds[username] = pw
        u = User(school_id=school.id, role=role, display_name=name, username=username, password_hash=hash_password(pw))
        db.add(u)
        db.flush()
        return u
    made = add_band_demo(db, school, people, teacher, make)
    db.commit()
    f = s.credentials_file or s.data_dir / "demo-credentials.txt"
    if made and f.exists():
        with open(f, "a", encoding="utf-8") as fh:
            fh.write("".join(f"{k}: {creds[k]}    # {n}, student ({lvl})\n" for k, n, lvl, *_ in people["band_demo"] if k in made))


def next_friday(after: datetime) -> datetime:
    d = after + timedelta(days=1)
    while d.isoweekday() != 5:
        d += timedelta(days=1)
    return d.replace(hour=15, minute=0, second=0, microsecond=0)


def add_assignment(db: Session, cls: ClassRoom, teacher: User, pack: dict, due: datetime) -> Assignment:
    """One homework assignment with its questions, hint ladders and answer keys (answer keys never leave the server)."""
    a = Assignment(id=pack["id"], class_id=cls.id, lesson_id=pack["lesson_id"], title=pack["title"], subject=pack["subject"],
                   instructions=pack["instructions"], due_at=due, ai_help_policy=pack["ai_help_policy"],
                   kind="homework", max_score=pack["max_score"], set_by_id=teacher.id)
    db.add(a)
    db.flush()
    for q in pack["questions"]:
        db.add(Question(id=f"{a.id}:{q['id']}", assignment_id=a.id, index=q["index"], prompt=q["prompt"], code=q.get("code"), kind=q["kind"]))
        db.flush()
        for i, h in enumerate(q["hints"], start=1):
            db.add(QuestionHint(question_id=f"{a.id}:{q['id']}", step=i, text=h))
        db.add(AnswerKey(question_id=f"{a.id}:{q['id']}", kind=q["key"]["kind"], value={k: v for k, v in q["key"].items() if k != "kind"},
                         misconceptions=q.get("misconceptions", [])))
    db.flush()
    return a


def sync_content(db: Session) -> None:
    """A database made before a lesson or assignment shipped gets it now: lesson availability follows the catalog, and the
    class of the demo school receives any assignment it does not have yet. Nothing already there is changed."""
    ensure_edition_demo(db)
    if get_settings().brand not in ("", "umanah"):
        grades_from_levels(db)
    for c in catalog()["courses"]:
        for n, l in enumerate(c["lessons"], start=1):
            row = db.get(Lesson, l.get("id") or f"{c['id']}-l{n}")
            if row is not None and row.available != bool(l.get("available")):
                row.available = bool(l.get("available"))
    cls = db.scalars(select(ClassRoom).order_by(ClassRoom.id)).first()
    teacher = db.get(User, cls.teacher_id) if cls else None
    if cls and teacher:
        for weeks, aid in ((1, "asg-lists-practice"), (2, "asg-while-practice"), (3, "asg-ai-practice")):
            if not db.get(Assignment, aid) and (pack := assignment_pack(aid)):
                add_assignment(db, cls, teacher, pack, next_friday(datetime.now(UTC)) + timedelta(days=7 * weeks))
    db.commit()


def seed(db: Session, write_credentials: bool = True) -> dict[str, str]:
    """Returns {username: password} for the demo accounts (also written to a 0600 file, never to the repo)."""
    s = get_settings()
    if db.scalar(select(School.id)):
        return {}
    from .branding import edition
    ed = edition()
    people = EDU54_PEOPLE.get(ed["id"]) if s.brand not in ("", "umanah") else None
    if people:
        school = School(name=ed["demoSchool"], local_slug=ed["demoSchool"].lower().replace(" ", "-"), settings={"country": "NG"})
    else:
        school = School(name="Demo Academy", local_slug="demo-academy", settings={"country": "US"})
    db.add(school)
    db.flush()
    creds: dict[str, str] = {}

    def mk(username: str, name: str, role: str, title: str | None = None) -> User:
        pw = s.demo_password or secrets.token_urlsafe(9)
        creds[username] = pw
        u = User(school_id=school.id, role=role, display_name=name, username=username, title=title, password_hash=hash_password(pw))
        db.add(u)
        db.flush()
        return u

    if people:
        admin = mk("admin", "Demo Admin", "owner", ed["terms"]["admin"])
        williams, _second = (mk(u, n, "teacher", t) for u, n, t in people["teachers"])
        su, sn, st = people["safety"]
        rivera = mk(su, sn, "counselor", st)
        db.add(SafetyContact(user_id=rivera.id, school_id=school.id, is_primary=True, location=None))
        db.add(SafetyContact(user_id=admin.id, school_id=school.id, is_primary=False))
        jordan, *others = (mk(n.split()[0].lower(), n, "student") for n in people["students"])
        cname, csubject, cterm, band = people["class"]
        cls = ClassRoom(school_id=school.id, teacher_id=williams.id, name=cname, subject=csubject, term=cterm, settings={"age_band": band, "language": "en", "level": people["level"]})
    else:
        admin = mk("admin", "Demo Admin", "owner", "School Owner")
        williams = mk("mswilliams", "Ms. Williams", "teacher", "teacher")
        rivera = mk("msrivera", "Ms. Rivera", "counselor", "school counselor, Room 12")
        db.add(SafetyContact(user_id=rivera.id, school_id=school.id, is_primary=True, location="Room 12"))
        db.add(SafetyContact(user_id=admin.id, school_id=school.id, is_primary=False))
        jordan = mk("jordan", "Jordan Smith", "student")
        others = [mk(f"student{i + 1:02d}", f"{FIRST[i]} {LAST[i]}", "student") for i in range(27)]
        for u in [jordan, *others]:
            u.grade = 7       # Period 3 is a Grade 7 class (Middle School, the Build band)
        cls = ClassRoom(school_id=school.id, teacher_id=williams.id, name="Period 3 — Introduction to AI", subject="Computer Science",
                        term="Fall", settings={"age_band": "13-15", "language": "en"})
    db.add(cls)
    db.flush()
    for u in [jordan, *others]:
        db.add(ClassMember(class_id=cls.id, user_id=u.id))
    if people:
        add_band_demo(db, school, people, _second, lambda u, n, r: mk(u, n, r))
        grades_from_levels(db)

    # ---- catalog ------------------------------------------------------------------------------------
    for c in catalog()["courses"]:
        db.add(Course(id=c["id"], title=c["title"], description=c["description"], icon=c["icon"], accent=c["accent"], position=c["position"]))
        db.flush()
        for n, l in enumerate(c["lessons"], start=1):
            lid = l.get("id") or f"{c['id']}-l{n}"
            db.add(Lesson(id=lid, course_id=c["id"], module=l["module"], number=n, title=l["title"], available=bool(l.get("available"))))
            db.flush()
            if n <= c["seed_completed"]:
                db.add(LessonProgress(user_id=jordan.id, lesson_id=lid, state="completed", steps={}, percent=100, completed_at=now() - timedelta(days=30 - n)))
    db.flush()

    # ---- two sample Local Documents from Ms. Williams (text files stored next to the database) -----------
    from .models import Document
    docs_dir = s.data_dir / "documents"
    docs_dir.mkdir(parents=True, exist_ok=True)
    for title, fname, text in [
        ("Python loops cheat sheet", "loops-cheat-sheet.txt", "PYTHON LOOPS CHEAT SHEET\n\nfor number in range(1, 6):\n    print(number)      # 1 2 3 4 5 (stops before 6)\n\n"
         "total = 0\nfor n in [3, 5, 7]:\n    total = total + n  # running total\n\nwhile lives > 0:\n    play()             # repeats until the condition is false\n\n"
         "Tips: range(start, stop) stops BEFORE stop. Indent the loop body by 4 spaces.\n"),
        ("Period 3 class rules", "class-rules.txt", "PERIOD 3: HOW WE WORK\n\n1. Try first, then ask the tutor for a hint, then ask a classmate, then ask me.\n"
         "2. The AI tutor gives hints on homework, not answers. That's on purpose.\n3. Save your Build projects before the bell.\n4. Be kind online and offline.\n"),
    ]:
        d = Document(school_id=school.id, title=title, filename=fname, mime="text/plain", size=len(text.encode()), audience="students", uploaded_by_id=williams.id)
        db.add(d)
        db.flush()
        (docs_dir / f"{d.id}.txt").write_text(text)

    # ---- the rest of the class: earlier lessons done, some AI Foundations progress, XP to match (deterministic) ----
    py = [f"python-foundations-l{n}" for n in range(1, 6)]
    for i, u in enumerate(others):
        for lid in py:
            db.add(LessonProgress(user_id=u.id, lesson_id=lid, state="completed", percent=100, steps={}, completed_at=now() - timedelta(days=20)))
        for n in range(1, 3 + (i * 7) % 8):
            db.add(LessonProgress(user_id=u.id, lesson_id=f"ai-foundations-l{n}", state="completed", percent=100, steps={}, completed_at=now() - timedelta(days=10)))
        award_xp(db, u.id, f"seed:{u.id}:starting-xp", "seed", 350 + ((i * 137) % 1100), reason="demo starting XP")
    db.flush()

    # ---- Jordan: 1,420 XP (Level 4 — Builder) and a 6 school-day streak -------------------------------
    award_xp(db, jordan.id, f"seed:{jordan.id}:starting-xp", "seed", 1420, reason="demo starting XP")
    for b in ("python-starter", "first-builder", "streak-5"):
        db.add(UserBadge(user_id=jordan.id, badge_id=b))
    # a few revision answers so Weak Topics is not empty (Jordan keeps mixing up where range starts and stops)
    for k, (qid, concept, ok) in enumerate([("rq2", "range start", False), ("rq7", "range count", True), ("rq8", "range start and stop", False), ("rq1", "range count", True),
                                            ("rq2", "range start", False), ("rq4", "accumulating a total", True)]):
        db.add(RevisionAttempt(user_id=jordan.id, question_id=qid, concept=concept, correct=ok, source="practice", created_at=now() - timedelta(days=4 - k // 2)))
    for i, (title, status, code) in enumerate([
        ("Calculator", "complete", "a = 12\nb = 4\nprint(a + b)\nprint(a - b)\nprint(a * b)\nprint(a / b)\n"),
        ("Number Guessing Game", "complete", "secret = 7\nfor guess in [3, 9, 7]:\n    if guess == secret:\n        print('You got it!')\n    else:\n        print('Try again')\n"),
        ("Temperature Converter", "in_progress", "for c in range(0, 41, 10):\n    print(c, 'C is', c * 9 / 5 + 32, 'F')\n")]):
        db.add(Project(user_id=jordan.id, title=title, category="python-lab", code=code, status=status, updated_at=now() - timedelta(days=12 - i * 4)))
    d, n = date.today(), 0
    while n < 6:
        if is_school_day(d):
            db.add(ActivityDay(user_id=jordan.id, day=d.isoformat()))
            n += 1
        d -= timedelta(days=1)

    # ---- the Loops Practice assignment ----------------------------------------------------------------
    pack = assignment_pack("asg-loops-practice")
    a = add_assignment(db, cls, williams, pack, next_friday(datetime.now(UTC)))
    for extra, weeks in (("asg-lists-practice", 1), ("asg-while-practice", 2), ("asg-ai-practice", 3)):
        add_assignment(db, cls, williams, assignment_pack(extra), next_friday(datetime.now(UTC)) + timedelta(days=7 * weeks))
    qids = [f"{a.id}:{q['id']}" for q in pack["questions"]]

    # ---- the rest of Period 3 on Lesson 6: 19 completed, 6 in progress, 2 not started (+ Jordan) -----------
    for i, u in enumerate(others):
        if i < 19:
            db.add(LessonProgress(user_id=u.id, lesson_id="py-l6", state="completed", percent=100, steps={}, completed_at=now() - timedelta(days=1 + i % 4)))
        elif i < 25:
            pct = [20, 40, 20, 40, 20, 40][i - 19]
            db.add(LessonProgress(user_id=u.id, lesson_id="py-l6", state="in_progress", percent=pct, steps={"read": True}))
            if i - 19 < 4:                          # four students are stuck on the same question -> "may need help with loops"
                for _ in range(2):
                    db.add(QuestionAttempt(user_id=u.id, question_id=qids[0], kind="check", correct=False, misconception="off-by-one-start"))
    # a few submissions so the teacher has real work to review
    for i, u in enumerate(others[:5]):
        answers = {qids[0]: "0 1 2 3", qids[1]: "5", qids[2]: "12"} if i % 2 == 0 else {qids[0]: "1 2 3 4", qids[1]: "6", qids[2]: "12"}
        state = "returned" if i < 3 else "submitted"
        sub = Submission(assignment_id=a.id, user_id=u.id, state=state, answers=answers, submitted_at=now() - timedelta(hours=3 + i * 5))
        if state == "returned":
            sub.score, sub.teacher_feedback, sub.graded_by_id, sub.graded_at = (3.0 if i % 2 == 0 else 1.0), "Thanks for your work.", williams.id, now() - timedelta(hours=1)
        db.add(sub)
    db.flush()
    from .demo import seed_chats
    seed_chats(db)
    db.commit()

    if s.data_dir and write_credentials:
        f = s.credentials_file or s.data_dir / "demo-credentials.txt"
        f.parent.mkdir(parents=True, exist_ok=True)
        roles = {u.username: (u.display_name, u.role) for u in db.scalars(select(User).where(User.school_id == school.id))}
        head = f"# Demo accounts for {school.name} (fictional). Random per install. Not in Git.\n" if people else "# Demo accounts (fictional). Random per install. Not in Git.\n"
        f.write_text(head + "\n".join(f"{k}: {v}" + (f"    # {roles[k][0]}, {roles[k][1]}" if people else "") for k, v in creds.items()) + "\n")
        os.chmod(f, 0o600)
    return creds
