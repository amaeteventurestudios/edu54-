"""Local Documents: staff upload, students see the student-shared ones, files stay on the device."""
from tests.conftest import login

PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


def up(c, title, audience="students", body=PDF, ctype="application/pdf"):
    return c.post("/api/documents", params={"title": title, "filename": f"{title}.pdf", "audience": audience}, content=body,
                  headers={"Content-Type": ctype, "X-CSRF-Token": c.cookies.get("umanah_csrf")})


def test_staff_upload_students_read_only_their_documents(app):
    t = login(app, "mswilliams")
    r = up(t, "Field trip permission")
    assert r.status_code == 201 and r.json()["type"] == "pdf"
    assert up(t, "Answer key", audience="staff").status_code == 201
    s = login(app, "jordan")
    docs = s.get("/api/documents").json()
    assert [d["title"] for d in docs["documents"]][:1] == ["Field trip permission"] and "Answer key" not in [d["title"] for d in docs["documents"]] and docs["can_upload"] is False
    f = s.get(docs["documents"][0]["url"])
    assert f.status_code == 200 and f.content == PDF and f.headers["content-type"] == "application/pdf"
    staff_doc = next(d for d in t.get("/api/documents").json()["documents"] if d["title"] == "Answer key")
    assert s.get(staff_doc["url"]).status_code == 404
    assert up(s, "Mine").status_code == 403


def test_upload_checks_type_and_content(app):
    t = login(app, "mswilliams")
    assert up(t, "Not a pdf", body=b"hello").status_code == 400
    assert up(t, "Program", ctype="application/x-msdownload").status_code == 400
    assert up(t, "Empty", body=b"").status_code == 400


def test_staff_remove_a_document(app):
    t = login(app, "mswilliams")
    did = up(t, "Old handout").json()["id"]
    assert t.delete(f"/api/documents/{did}", headers={"X-CSRF-Token": t.cookies.get("umanah_csrf")}).status_code == 204
    assert t.get(f"/api/documents/{did}/file").status_code == 404
