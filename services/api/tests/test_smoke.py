def test_health_and_login(client, student):
    assert client.get("/api/health").json()["status"] == "ok"
    me = student.get("/api/auth/me").json()["user"]
    assert me["name"] == "Jordan Smith" and me["role"] == "student"


def test_requires_auth(client):
    assert client.get("/api/courses").status_code == 401
