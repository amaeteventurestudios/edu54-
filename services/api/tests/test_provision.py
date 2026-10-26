"""Per-institution provisioning (docs/edu54 Phase 9): validated order file, one-time admin and safety logins, re-runnable."""
import os

from sqlalchemy import select

from umanah_api import provision as prov
from umanah_api.models import SafetyContact, School, User

SPEC = {"school_id": "test-college", "institution_name": "Test College", "country": "GH", "edition": "k12", "languages": ["en"],
        "branding": {"display": "EDU54 · Test College"}, "admin": {"name": "Ama Serwaa", "email": "ama@example.org"},
        "safety_contacts": [{"name": "Efua Mensah", "email": "efua@example.org"}]}


def test_validate_catches_problems():
    assert prov.validate(SPEC) == []
    bad = prov.validate({**SPEC, "school_id": "Bad Id", "edition": "both", "languages": ["fr"], "safety_contacts": []})
    assert len(bad) == 4


def test_provision_is_repeatable(app, tmp_path):
    from umanah_api.db import session_scope
    with session_scope() as db:
        r1 = prov.provision(db, SPEC, tmp_path)
        r2 = prov.provision(db, SPEC, tmp_path)
        school = db.scalar(select(School).where(School.local_slug == "test-college"))
        users = list(db.scalars(select(User).where(User.school_id == school.id)))
        assert sorted(u.role for u in users) == ["counselor", "owner"]
        assert all(u.must_change_password for u in users)
        assert db.scalar(select(SafetyContact).where(SafetyContact.school_id == school.id)).is_primary
    assert len(r1["created_accounts"]) == 2 and r2["created_accounts"] == []
    sheet = tmp_path / "first-login-test-college.txt"
    assert oct(os.stat(sheet).st_mode & 0o777) == "0o600" and "one-time password" in sheet.read_text()
    assert "password" not in str(r1["created_accounts"])
