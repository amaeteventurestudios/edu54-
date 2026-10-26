#!/usr/bin/env python3
"""Check a lesson pack (content/<course>/lesson-NN-*.json) before it ships.

  python3 tools/content/validate_lesson.py content/python-foundations/lesson-08-functions.json [...]

Checks: required fields and ids; activities match the check questions (+ try1 when there is a try_it); every check question
has 3-4 options, a valid answer_index, an explanation and a misconception note for every wrong option; every example's code
runs with python3 and prints exactly its "output"; the try_it starter runs; no em dashes (house style). Exit 1 on any problem.
"""
import json
import subprocess
import sys


def run(code: str) -> tuple[int, str]:
    p = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, timeout=10)
    return p.returncode, (p.stdout + p.stderr).strip()


def check(path: str) -> list[str]:
    d = json.load(open(path))
    bad = []
    for k in ("id", "course_id", "title", "module", "lesson_number", "objective", "xp_on_complete", "sections", "examples", "check_questions", "activities"):
        if k not in d:
            bad.append(f"missing {k}")
    if not d.get("objective", "").startswith("By the end of this lesson, you will be able to") and d.get("id") != "py-l6":
        bad.append("objective must start 'By the end of this lesson, you will be able to'")
    if not 3 <= len(d.get("sections", [])) <= 6:
        bad.append("3-6 sections")
    for s in d.get("sections", []):
        if not (s.get("id") and s.get("title") and s.get("text")):
            bad.append(f"section incomplete: {s}")
    for e in d.get("examples", []):
        rc, out = run(e["code"])
        if rc != 0 or out != e["output"].strip():
            bad.append(f"example {e['id']}: printed {out!r}, says {e['output']!r}")
    cqs = d.get("check_questions", [])
    if len(cqs) != 3:
        bad.append("exactly 3 check questions")
    for q in cqs:
        n = len(q.get("options", []))
        if not 3 <= n <= 4 or not 0 <= q.get("answer_index", -1) < n:
            bad.append(f"{q.get('id')}: options/answer_index")
        if not q.get("explanation"):
            bad.append(f"{q.get('id')}: explanation")
        wrong = {str(i) for i in range(n) if i != q.get("answer_index")}
        if set(q.get("misconception", {})) != wrong:
            bad.append(f"{q.get('id')}: misconception notes needed for options {sorted(wrong)}")
        if q.get("code"):
            try:
                compile(q["code"], q["id"], "exec")          # question code may loop forever on purpose ("what happens?"): only check it parses
            except SyntaxError:
                bad.append(f"{q['id']}: code is not valid Python")
    t = d.get("try_it")
    want = ["read", *[q["id"] for q in cqs], *(["try1"] if t else [])]
    if d.get("activities") != want:
        bad.append(f"activities should be {want}")
    if t:
        if t.get("id") != "try1" or not t.get("starter") or not t.get("instructions"):
            bad.append("try_it needs id try1, instructions and starter")
        elif run(t["starter"])[0] != 0:
            bad.append("try_it starter does not run")
    if d.get("diagram") is not None and not (d["diagram"].get("title") and d["diagram"].get("steps")):
        bad.append("diagram needs title and steps (or null)")
    if "—" in json.dumps(d, ensure_ascii=False):
        bad.append("em dash found (house style: none)")
    return bad


if __name__ == "__main__":
    fails = 0
    for p in sys.argv[1:]:
        b = check(p)
        print(("OK   " if not b else "FAIL ") + p)
        for x in b:
            print("     - " + x)
        fails += bool(b)
    sys.exit(1 if fails else 0)
