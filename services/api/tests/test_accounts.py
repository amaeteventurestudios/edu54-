"""Roles, admin area, teacher class tools, notifications (part E). Every rule is enforced on the server, so every rule is tested through the API."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from tests.conftest import login
from umanah_api.db import session_scope
from umanah_api.models import AuditLog, Conversation, Notification, SafetyContact, User


def login_with(app, username: str, password: str) -> TestClient:
    c = TestClient(app)
    r = c.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    c.headers["X-CSRF-Token"] = r.json()["csrf"]
    return c


def make(owner, name, role, **kw):
    r = owner.post("/api/admin/people", json={"name": name, "role": role, **kw})
    assert r.status_code == 201, r.text
    return r.json()


def usable(app, person, new="a-good-password-1") -> TestClient:
    """Sign in with the temporary credential and choose a real password, like a new person would."""
    c = login_with(app, person["username"], person["credential"])
    if person.get("must_change_password"):
        assert c.post("/api/auth/change-password", json={"current": person["credential"], "new": new}).status_code == 200
    return c


# ------------------------------------------------------------------------------------------------ roles
def test_demo_roles(app):
    me = login(app, "admin").get("/api/auth/me").json()["user"]
    assert me["role"] == "owner" and me["role_label"] == "School Owner" and "data.delete" in me["permissions"]
    assert login(app, "msrivera").get("/api/auth/me").json()["user"]["role"] == "counselor"


def test_owner_creates_admin_but_admin_cannot_create_owner_or_admin(app):
    owner = login(app, "admin")
    adm = make(owner, "Ada Admin", "school_admin")
    a = usable(app, adm)
    assert a.post("/api/admin/people", json={"name": "X", "role": "owner"}).status_code == 403
    assert a.post("/api/admin/people", json={"name": "X", "role": "school_admin"}).status_code == 403
    assert a.post("/api/admin/people", json={"name": "Tia Teacher", "role": "teacher"}).status_code == 201


def test_nobody_manages_equal_or_higher_or_themselves(app):
    owner = login(app, "admin")
    adm = usable(app, make(owner, "Ada Admin", "school_admin"))
    me = adm.get("/api/auth/me").json()["user"]["id"]
    owner_id = login(app, "admin").get("/api/auth/me").json()["user"]["id"]
    assert adm.patch(f"/api/admin/people/{owner_id}", json={"name": "Hacked"}).status_code == 403
    assert adm.post(f"/api/admin/people/{owner_id}/deactivate").status_code == 403
    assert adm.patch(f"/api/admin/people/{me}", json={"role": "owner"}).status_code == 403          # nobody changes their own role
    assert adm.post(f"/api/admin/people/{me}/deactivate").status_code == 403


def test_last_owner_is_protected(app):
    owner = login(app, "admin")
    oid = owner.get("/api/auth/me").json()["user"]["id"]
    second = make(owner, "Olu Owner", "owner")
    o2 = usable(app, second)
    # two owners: one may deactivate the other. Then only one is left:
    assert o2.post(f"/api/admin/people/{oid}/deactivate").status_code == 200
    with session_scope() as db:
        assert db.get(User, oid).status == "inactive"
    # now o2 is the only active owner; nobody can remove them
    third = make(o2, "Ada Admin", "school_admin")
    adm = usable(app, third)
    assert adm.post(f"/api/admin/people/{second['id']}/deactivate").status_code == 403
    assert o2.post(f"/api/admin/people/{second['id']}/deactivate").status_code == 403      # not on yourself


def test_owners_can_change_each_other_but_never_themselves(app):
    owner = login(app, "admin")
    oid = owner.get("/api/auth/me").json()["user"]["id"]
    o2p = make(owner, "Olu Owner", "owner")
    o2 = usable(app, o2p)
    assert o2.patch(f"/api/admin/people/{oid}", json={"role": "school_admin"}).status_code == 200      # two owners: allowed, one remains
    assert o2.patch(f"/api/admin/people/{oid}", json={"role": "owner"}).status_code == 200
    assert owner.post(f"/api/admin/people/{o2p['id']}/deactivate").status_code == 200
    assert owner.patch(f"/api/admin/people/{oid}", json={"role": "teacher"}).status_code == 403      # cannot change your own role


def test_sub_admin_only_holds_the_permissions_they_were_given(app):
    owner = login(app, "admin")
    sub = usable(app, make(owner, "Sam Sub", "sub_admin", permissions=["classes.manage"]))
    assert sub.get("/api/admin/classes").status_code == 200
    assert sub.get("/api/admin/audit").status_code == 403
    assert sub.post("/api/admin/people", json={"name": "N", "role": "student"}).status_code == 403
    assert sub.get("/api/admin/settings").status_code == 403
    assert sub.get("/api/admin/backups").status_code == 403
    assert sub.get("/api/admin/engines").status_code == 403


def test_nobody_grants_more_than_they_have(app):
    owner = login(app, "admin")
    sub = usable(app, make(owner, "Sam Sub", "sub_admin", permissions=["people.manage", "classes.manage"]))
    r = sub.post("/api/admin/people", json={"name": "Sub Two", "role": "sub_admin", "permissions": ["audit.view"]})
    assert r.status_code == 403                                                                        # a sub-admin cannot create sub-admins at all (equal rank)
    r = owner.post("/api/admin/people", json={"name": "Sub Three", "role": "sub_admin", "permissions": ["not.a.permission"]})
    assert r.status_code == 403
    adm = usable(app, make(owner, "Ada Admin", "school_admin"))
    assert adm.post("/api/admin/people", json={"name": "Sub Four", "role": "sub_admin", "permissions": ["audit.view", "backups.manage"]}).status_code == 201


def test_teachers_and_counselors_have_no_admin_area_and_counselors_no_teacher_tools(app):
    for who in ("mswilliams", "msrivera", "jordan"):
        assert login(app, who).get("/api/admin/overview").status_code == 403
    assert login(app, "msrivera").get("/api/teacher/overview").status_code == 403
    assert login(app, "msrivera").get("/api/safety/alerts").status_code == 200        # designated safety contact still works
    assert login(app, "jordan").get("/api/teacher/students").status_code == 403


# ------------------------------------------------------------------------------------------------ people lifecycle
def test_temporary_password_must_be_changed_before_anything_else(app):
    owner = login(app, "admin")
    p = make(owner, "Noor Newteacher", "teacher")
    c = login_with(app, p["username"], p["credential"])
    r = c.get("/api/teacher/classes")
    assert r.status_code == 403 and r.json()["error"]["code"] == "password_change_required"
    assert c.get("/api/auth/me").json()["user"]["must_change_password"] is True
    assert c.post("/api/auth/change-password", json={"current": p["credential"], "new": "short"}).status_code == 422
    assert c.post("/api/auth/change-password", json={"current": "wrong-password-1", "new": "a-good-password-1"}).status_code == 400
    assert c.post("/api/auth/change-password", json={"current": p["credential"], "new": "a-good-password-1"}).status_code == 200
    assert c.get("/api/teacher/classes").status_code == 200
    assert login_with(app, p["username"], "a-good-password-1")


def test_deactivate_blocks_sign_in_and_is_reversible_and_audited(app):
    owner = login(app, "admin")
    p = make(owner, "Tia Teacher", "teacher")
    t = usable(app, p)
    assert owner.post(f"/api/admin/people/{p['id']}/deactivate").status_code == 200
    assert t.get("/api/auth/me").status_code == 401                                                     # their session ended
    assert TestClient(app).post("/api/auth/login", json={"username": p["username"], "password": "a-good-password-1"}).status_code == 401
    assert owner.post(f"/api/admin/people/{p['id']}/reactivate").status_code == 200
    assert login_with(app, p["username"], "a-good-password-1")
    actions = [a["action"] for a in owner.get("/api/admin/audit").json()["entries"]]
    assert {"person.create", "person.deactivate", "person.reactivate"} <= set(actions)


def test_permanent_delete_needs_inactive_confirmation_and_takes_a_backup(app):
    owner = login(app, "admin")
    p = make(owner, "Pat Pupil", "student")
    assert owner.post(f"/api/admin/people/{p['id']}/delete", json={"confirm": p["username"]}).status_code == 409      # still active
    owner.post(f"/api/admin/people/{p['id']}/deactivate")
    assert owner.post(f"/api/admin/people/{p['id']}/delete", json={"confirm": "wrong"}).status_code == 400
    exp = owner.get(f"/api/admin/people/{p['id']}/export").json()
    assert exp["person"]["username"] == p["username"]
    r = owner.post(f"/api/admin/people/{p['id']}/delete", json={"confirm": p["username"]})
    assert r.status_code == 200 and r.json()["backup"]
    with session_scope() as db:
        assert db.scalar(select(User.id).where(User.username == p["username"])) is None
    assert any(a["action"] == "person.delete" for a in owner.get("/api/admin/audit").json()["entries"])


def test_permanent_delete_is_for_students_and_needs_the_permission(app):
    owner = login(app, "admin")
    t = make(owner, "Tia Teacher", "teacher")
    owner.post(f"/api/admin/people/{t['id']}/deactivate")
    assert owner.post(f"/api/admin/people/{t['id']}/delete", json={"confirm": t["username"]}).status_code == 409
    sub = usable(app, make(owner, "Sam Sub", "sub_admin", permissions=["people.manage"]))
    s = make(owner, "Pat Pupil", "student")
    sub.post(f"/api/admin/people/{s['id']}/deactivate")
    assert sub.post(f"/api/admin/people/{s['id']}/delete", json={"confirm": s["username"]}).status_code == 403


def test_deleting_a_student_removes_their_chats_and_work(app):
    owner = login(app, "admin")
    with session_scope() as db:
        jid = db.scalar(select(User.id).where(User.username == "student05"))
    owner.post(f"/api/admin/people/{jid}/deactivate")
    assert owner.post(f"/api/admin/people/{jid}/delete", json={"confirm": "student05"}).status_code == 200
    with session_scope() as db:
        assert db.scalar(select(Conversation.id).where(Conversation.user_id == jid)) is None


def test_reset_password_and_pin(app):
    owner = login(app, "admin")
    p = make(owner, "Pip Pupil", "student", credential="pin")
    assert len(p["credential"]) == 4 and p["pin_login"] is True
    c = login_with(app, p["username"], p["credential"])
    assert c.get("/api/auth/me").json()["user"]["must_change_password"] is False                       # PIN accounts skip the forced change
    assert c.post("/api/auth/change-password", json={"current": p["credential"], "new": "a-good-password-1"}).status_code == 403   # and cannot change their own
    r = owner.post(f"/api/admin/people/{p['id']}/reset-password", json={"kind": "password"}).json()
    assert r["credential"] != p["credential"] and "-" in r["credential"]
    assert make(owner, "Tia", "teacher").get("must_change_password") is True
    assert owner.post("/api/admin/people", json={"name": "X", "role": "teacher", "credential": "pin"}).status_code == 400


# ------------------------------------------------------------------------------------------------ classes, contacts, settings
def test_admin_classes_and_roster(app):
    owner = login(app, "admin")
    t = make(owner, "Tia Teacher", "teacher")
    s = make(owner, "Pat Pupil", "student")
    c = owner.post("/api/admin/classes", json={"name": "Period 5", "subject": "Science", "teacher_id": t["id"], "age_band": "under13"}).json()
    assert c["teacher"]["name"] == "Tia Teacher" and c["age_band"] == "under13"
    assert owner.post(f"/api/admin/classes/{c['id']}/members", json={"user_id": s["id"]}).status_code == 201
    assert [x["name"] for x in owner.get(f"/api/admin/classes/{c['id']}").json()["roster"]] == ["Pat Pupil"]
    assert owner.delete(f"/api/admin/classes/{c['id']}/members/{s['id']}").status_code == 204
    assert owner.post("/api/admin/classes", json={"name": "X", "teacher_id": s["id"]}).status_code == 400          # a student can't teach


def test_safety_contacts_never_drop_to_zero(app):
    owner = login(app, "admin")
    rows = owner.get("/api/admin/safety-contacts").json()["contacts"]
    assert {r["name"] for r in rows} >= {"Ms. Rivera"}
    ids = [r["user_id"] for r in rows]
    for uid in ids[:-1]:
        assert owner.delete(f"/api/admin/safety-contacts/{uid}").status_code == 204
    assert owner.delete(f"/api/admin/safety-contacts/{ids[-1]}").status_code == 409
    with session_scope() as db:
        assert db.scalars(select(SafetyContact)).all()
    t = make(owner, "Tia Teacher", "teacher")
    assert owner.put("/api/admin/safety-contacts", json={"user_id": t["id"], "is_primary": True}).status_code == 200
    rows = owner.get("/api/admin/safety-contacts").json()["contacts"]
    assert [r["name"] for r in rows if r["is_primary"]] == ["Tia Teacher"]
    assert owner.put("/api/admin/safety-contacts", json={"user_id": ids[0] if ids[0] != t["id"] else ids[-1], "is_primary": False}).status_code == 200


def test_the_only_safety_contact_cannot_be_deactivated(app):
    owner = login(app, "admin")
    rows = owner.get("/api/admin/safety-contacts").json()["contacts"]
    for r in rows[1:]:
        owner.delete(f"/api/admin/safety-contacts/{r['user_id']}")
    last = owner.get("/api/admin/safety-contacts").json()["contacts"][0]["user_id"]
    assert owner.post(f"/api/admin/people/{last}/deactivate").status_code in (409, 403)


def test_school_settings_emoji_setting_reaches_the_prompt(app, stub):
    owner = login(app, "admin")
    assert owner.put("/api/admin/settings", json={"school_name": "Demo Academy", "tutor_emoji": True, "chat_retention_days": 30}).status_code == 200
    assert owner.get("/api/admin/settings").json()["tutor_emoji"] is True
    j = login(app, "jordan")
    j.post("/api/ai/chat", json={"message": "hello there", "context": {}})
    assert "at most one friendly emoji" in stub.calls[-1]["messages"][0]["content"]
    j.post("/api/ai/chat", json={"message": "hello there", "context": {"type": "assignment", "id": "asg-loops-practice"}})
    assert "Do not use emoji" in stub.calls[-1]["messages"][0]["content"]                                 # never in homework


# ------------------------------------------------------------------------------------------------ engines, backups
def test_engine_start_is_refused_without_enough_free_ram_and_otherwise_queued(app, monkeypatch):
    from umanah_api.routers import admin as A
    owner = login(app, "admin")
    monkeypatch.setattr(A, "free_ram_gb", lambda: 2.6)
    r = owner.post("/api/admin/engines/lms", json={"action": "start"})               # needs about 1.3 GB: would leave 1.3 GB, under the 2 GB that is always kept free
    assert r.status_code == 409 and "free memory" in r.json()["error"]["message"]
    assert owner.post("/api/admin/engines/code", json={"action": "start"}).status_code == 202      # 0.5 GB leaves 2.1 GB: fine
    assert owner.post("/api/admin/engines/lms", json={"action": "stop"}).status_code == 202        # stopping is never refused


def test_engine_actions_are_files_for_the_host_helper(app, monkeypatch):
    from umanah_api.config import get_settings
    from umanah_api.routers import admin as A
    owner = login(app, "admin")
    monkeypatch.setattr(A, "free_ram_gb", lambda: 8.0)
    assert owner.post("/api/admin/engines/content", json={"action": "start"}).status_code == 202
    files = list((get_settings().data_dir / "control" / "requests").glob("*.json"))
    assert len(files) == 1 and '"content"' in files[0].read_text()
    assert owner.post("/api/admin/engines/nope", json={"action": "start"}).status_code == 404
    st = owner.get("/api/admin/engines").json()
    assert {p["id"] for p in st["profiles"]} == {"content", "lms", "code", "admin"} and st["keep_free_gb"] == 2.0


def test_backup_is_verified_and_downloadable(app):
    owner = login(app, "admin")
    b = owner.post("/api/admin/backups").json()
    assert b["verified"] is True and b["people"] >= 30
    assert [x["name"] for x in owner.get("/api/admin/backups").json()["backups"]] == [b["name"]]
    d = owner.get(f"/api/admin/backups/{b['name']}")
    assert d.status_code == 200 and d.content[:15] == b"SQLite format 3"
    assert owner.get("/api/admin/backups/../umanah.sqlite3").status_code in (404, 400)
    assert owner.get("/api/admin/export/people.csv").text.startswith("name,username,role")


# ------------------------------------------------------------------------------------------------ teacher class tools
def test_teacher_adds_students_one_by_one_and_by_csv(app):
    t = login(app, "mswilliams")
    cid = t.get("/api/teacher/classes").json()["classes"][0]["id"]
    one = t.post(f"/api/teacher/classes/{cid}/students", json={"name": "Zara Zed"}).json()
    assert one["username"] == "zara.zed" and "-" in one["credential"]
    two = t.post(f"/api/teacher/classes/{cid}/students", json={"name": "Zara Zed", "credential": "pin"}).json()
    assert two["username"] == "zara.zed2" and len(two["credential"]) == 4
    r = t.post(f"/api/teacher/classes/{cid}/students/import", json={"csv": "name\nAmy Ash\nBen Birch\n \n" + "X" * 90 + "\nCy Cedar"}).json()
    assert [c["name"] for c in r["created"]] == ["Amy Ash", "Ben Birch", "Cy Cedar"] and len(r["errors"]) == 1 and r["errors"][0]["row"] == 3
    assert t.post(f"/api/teacher/classes/{cid}/students/import", json={"csv": "\n".join(f"S{i}" for i in range(201))}).status_code == 400
    roster = t.get(f"/api/teacher/classes/{cid}/students").json()["students"]
    assert len(roster) == 28 + 5
    s = usable(app, {**one, "must_change_password": True})
    assert s.get("/api/auth/me").json()["user"]["role"] == "student"


def test_teacher_edits_resets_moves_and_removes_only_in_their_own_classes(app):
    owner = login(app, "admin")
    other = make(owner, "Otto Other", "teacher")
    oc = owner.post("/api/admin/classes", json={"name": "Otto's class", "teacher_id": other["id"]}).json()
    t = login(app, "mswilliams")
    mine = t.get("/api/teacher/classes").json()["classes"][0]["id"]
    one = t.post(f"/api/teacher/classes/{mine}/students", json={"name": "Zara Zed"}).json()
    assert t.patch(f"/api/teacher/students/{one['id']}", json={"name": "Zara Z. Zed"}).json()["name"] == "Zara Z. Zed"
    assert t.post(f"/api/teacher/students/{one['id']}/reset", json={"kind": "pin"}).json()["credential"].isdigit()
    assert t.post(f"/api/teacher/students/{one['id']}/move", json={"from_class_id": mine, "to_class_id": oc["id"]}).status_code == 404      # not their class
    assert t.post(f"/api/teacher/classes/{oc['id']}/students", json={"name": "Nope"}).status_code == 404
    assert t.get(f"/api/teacher/classes/{oc['id']}/students").status_code == 404
    ot = usable(app, other)
    someone = ot.post(f"/api/teacher/classes/{oc['id']}/students", json={"name": "Otto Pupil"}).json()
    assert t.patch(f"/api/teacher/students/{someone['id']}", json={"name": "Hacked"}).status_code == 404
    assert t.post(f"/api/teacher/students/{someone['id']}/reset", json={}).status_code == 404
    assert t.get(f"/api/teacher/students/{someone['id']}").status_code == 404
    assert t.delete(f"/api/teacher/classes/{mine}/students/{one['id']}").status_code == 204
    still = t.get("/api/teacher/students").json()["students"]
    assert one["id"] not in [s["id"] for s in still]
    with session_scope() as db:
        assert db.get(User, one["id"]).status == "active"                                              # removed from the class, not from the school


def test_teacher_moves_a_student_between_two_of_their_classes(app):
    owner = login(app, "admin")
    tid = login(app, "mswilliams").get("/api/auth/me").json()["user"]["id"]
    c2 = owner.post("/api/admin/classes", json={"name": "Period 4", "teacher_id": tid}).json()
    t = login(app, "mswilliams")
    mine = t.get("/api/teacher/classes").json()["classes"][0]["id"]
    one = t.post(f"/api/teacher/classes/{mine}/students", json={"name": "Zara Zed"}).json()
    assert t.post(f"/api/teacher/students/{one['id']}/move", json={"from_class_id": mine, "to_class_id": c2["id"]}).status_code == 200
    assert [s["name"] for s in t.get(f"/api/teacher/classes/{c2['id']}/students").json()["students"]] == ["Zara Zed"]


# ------------------------------------------------------------------------------------------------ grading, notifications, flagged answers
def test_grading_notifies_the_student_and_they_can_mark_it_read(app):
    j = login(app, "jordan")
    j.put("/api/assignments/asg-loops-practice/draft", json={"answers": {"asg-loops-practice:q1": "0 1 2 3"}})
    assert j.post("/api/assignments/asg-loops-practice/submit").status_code == 200
    t = login(app, "mswilliams")
    with session_scope() as db:
        from umanah_api.models import Submission
        sid = db.scalar(select(Submission.id).join(User, User.id == Submission.user_id).where(User.username == "jordan"))
    assert t.post(f"/api/teacher/submissions/{sid}/grade", json={"score": 2, "feedback": "Nice work on question 1."}).status_code == 200
    n = j.get("/api/notifications").json()
    assert n["unread"] == 1 and n["items"][0]["title"] == "Loops Practice was graded" and "2 out of 3" in n["items"][0]["body"] and n["items"][0]["link"].endswith("asg-loops-practice")
    assert login(app, "student01").get("/api/notifications").json()["unread"] == 0                     # only their own
    j.post("/api/notifications/read", json={})
    assert j.get("/api/notifications").json()["unread"] == 0


def test_teacher_sees_flagged_answers_from_their_students_only(app):
    t = login(app, "mswilliams")
    j = login(app, "jordan")
    conv = next(c for c in j.get("/api/ai/conversations").json()["conversations"] if c["mode"] == "lesson")
    reply = next(m for m in j.get(f"/api/ai/conversations/{conv['id']}").json()["messages"] if m["role"] == "assistant")
    assert j.post(f"/api/ai/messages/{reply['id']}/feedback", json={"value": "down"}).status_code == 200
    flagged = t.get("/api/teacher/flagged").json()["flagged"]
    assert any(f["student"] == "Jordan Smith" and f["answer"] for f in flagged)
    owner = login(app, "admin")
    other = usable(app, make(owner, "Otto Other", "teacher"))
    assert other.get("/api/teacher/flagged").json()["flagged"] == []


def test_every_admin_action_is_in_the_audit_log(app):
    owner = login(app, "admin")
    p = make(owner, "Tia Teacher", "teacher")
    owner.patch(f"/api/admin/people/{p['id']}", json={"title": "Head of Science"})
    owner.put("/api/admin/settings", json={"school_name": "Demo Academy", "tutor_emoji": False, "chat_retention_days": 60})
    log = owner.get("/api/admin/audit").json()["entries"]
    assert [e["action"] for e in log[:3]] == ["settings.update", "person.edit", "person.create"] and log[0]["actor"] == "Demo Admin"
    assert owner.get("/api/admin/audit", params={"q": "settings"}).json()["entries"][0]["action"] == "settings.update"
