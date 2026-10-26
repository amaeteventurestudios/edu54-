"""Tutor load test (docs/43 "Benchmark protocol").

    UMANAH_CREDS="$(cat /srv/ai-node/storage/ssd/umanah-ai-lab/database/demo-credentials.txt)" \
      uv run --with httpx python tools/loadtest/loadtest.py --url http://127.0.0.1:8101 --students 5 10 --asks 2 --out results.json

Simulates N students, each: log in, then repeat [think 4-12 s (reads/types) -> Ask a free question -> read the streamed reply].
Uses the real HTTP path (login, CSRF, SSE stream), so the queue, safety screening and leak check are all included.
Reports per N: time to first word (p50/p95), words/s per student, queue waits, errors/timeouts, memory/swap, plus
wall clock. Credentials are read from the env (never written anywhere). Demo accounts: jordan + student01..27 (28 max;
higher N reuses accounts, which the one-request-in-flight rule then serialises — noted in the output).
"""
from __future__ import annotations

import argparse, asyncio, json, os, random, statistics, time
import httpx

QUESTIONS = [
    "What is a loop in Python?", "Can you explain what a variable is?", "Why does my program print the same thing twice?",
    "What is the difference between a list and a string?", "How do I know when to use a for loop?",
    "What does range(5) give me?", "Can you explain what a function is in simple words?", "What is a bug and how do I find one?",
    "How does a computer store numbers?", "What is an if statement for?", "Why is indentation important in Python?",
    "What is an algorithm?",
]


def creds() -> dict[str, str]:
    out = {}
    for line in os.environ["UMANAH_CREDS"].splitlines():
        if ":" in line and not line.startswith("#"):
            k, v = line.split(":", 1)
            out[k.strip()] = v.strip()
    return out


def mem() -> dict:
    m = {l.split(":")[0]: int(l.split()[1]) for l in open("/proc/meminfo")}
    return {"avail_gb": round(m["MemAvailable"] / 1048576, 2), "swap_used_gb": round((m["SwapTotal"] - m["SwapFree"]) / 1048576, 2)}


def pct(xs: list[float], p: float) -> float | None:
    if not xs:
        return None
    xs = sorted(xs)
    return round(xs[min(len(xs) - 1, int(round(p / 100 * (len(xs) - 1))))], 2)


async def student(url: str, user: str, pw: str, asks: int, timeout: float, rec: list, rng: random.Random):
    async with httpx.AsyncClient(base_url=url, timeout=httpx.Timeout(timeout, connect=10)) as c:
        r = await c.post("/api/auth/login", json={"username": user, "password": pw})
        if r.status_code != 200:
            rec.append({"user": user, "error": f"login {r.status_code}"}); return
        c.headers["X-CSRF-Token"] = r.json()["csrf"]
        for _ in range(asks):
            await asyncio.sleep(rng.uniform(4, 12))
            q, t0, first, words, queued, qpos, err, end = rng.choice(QUESTIONS), time.monotonic(), None, 0, None, 0, None, None
            try:
                async with c.stream("POST", "/api/ai/chat", json={"message": q}) as resp:
                    if resp.status_code != 200:
                        err = f"http {resp.status_code}"
                    else:
                        async for line in resp.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            e = json.loads(line[6:])
                            now = time.monotonic()
                            if e["type"] == "queue":
                                queued = queued or now; qpos = max(qpos, e.get("position", 0))
                            elif e["type"] == "token":
                                first = first or now; words += len(e["text"].split())
                            elif e["type"] == "error":
                                err = e.get("code", "error")
                            elif e["type"] == "done":
                                end = now
            except (httpx.TimeoutException, httpx.TransportError) as ex:
                err = f"timeout/{type(ex).__name__}"
            done = end or time.monotonic()
            rec.append({"user": user, "ttfw_s": (first - t0) if first else None, "total_s": done - t0, "words": words,
                        "wps": words / (done - first) if first and done > first else None,
                        "queue_wait_s": (first - queued) if (queued and first) else 0.0 if first else None, "max_queue_pos": qpos, "error": err})


async def run(url: str, n: int, asks: int, timeout: float, seed: int) -> dict:
    cr = creds(); names = ["jordan"] + [f"student{i:02d}" for i in range(1, 28)]
    rec: list = []; rng = random.Random(seed); t0 = time.monotonic(); peak = {"avail_gb": 99.0, "swap_used_gb": 0.0}
    stop = asyncio.Event()

    async def sampler():
        while not stop.is_set():
            m = mem(); peak["avail_gb"] = min(peak["avail_gb"], m["avail_gb"]); peak["swap_used_gb"] = max(peak["swap_used_gb"], m["swap_used_gb"])
            await asyncio.sleep(2)
    s = asyncio.create_task(sampler())
    await asyncio.gather(*[student(url, names[i % len(names)], cr[names[i % len(names)]], asks, timeout, rec, random.Random(rng.random())) for i in range(n)])
    stop.set(); await s
    ok = [r for r in rec if r.get("ttfw_s") is not None and not r.get("error")]
    errs = [r for r in rec if r.get("error")]
    return {"students": n, "asks_each": asks, "requests": len(rec), "ok": len(ok), "errors": len(errs), "error_kinds": sorted({r["error"] for r in errs}),
            "ttfw_p50_s": pct([r["ttfw_s"] for r in ok], 50), "ttfw_p95_s": pct([r["ttfw_s"] for r in ok], 95),
            "wps_p50": pct([r["wps"] for r in ok if r["wps"]], 50), "queue_wait_p50_s": pct([r["queue_wait_s"] for r in ok], 50),
            "queue_wait_p95_s": pct([r["queue_wait_s"] for r in ok], 95), "max_queue_pos": max([r.get("max_queue_pos", 0) for r in rec] or [0]),
            "reply_words_p50": pct([r["words"] for r in ok], 50), "wall_s": round(time.monotonic() - t0, 1),
            "min_avail_gb": peak["avail_gb"], "peak_swap_gb": peak["swap_used_gb"], "accounts_reused": n > len(names)}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--url", default="http://127.0.0.1:8101"); ap.add_argument("--students", type=int, nargs="+", default=[5, 10])
    ap.add_argument("--asks", type=int, default=2); ap.add_argument("--timeout", type=float, default=180); ap.add_argument("--seed", type=int, default=7); ap.add_argument("--out")
    a = ap.parse_args(); results = []
    # A load test writes hundreds of chats. Never into the demo database (docs/46): run it against a scratch server
    # (tools/dev-shots-server.sh with BACKEND=ollama) and pass that server's credentials in UMANAH_CREDS.
    inst = httpx.get(a.url.rstrip("/") + "/api/health", timeout=10).json().get("instance", "unknown")
    if inst == "demo":
        raise SystemExit(f"Refusing: {a.url} is the demo database (instance=demo). Use a scratch server, e.g. BACKEND=ollama tools/dev-shots-server.sh 8104")
    for n in a.students:
        print(f"== {n} students", flush=True); r = asyncio.run(run(a.url, n, a.asks, a.timeout, a.seed)); print(json.dumps(r), flush=True); results.append(r)
    if a.out:
        json.dump({"at": time.strftime("%Y-%m-%d %H:%M:%S"), "results": results}, open(a.out, "w"), indent=2)


if __name__ == "__main__":
    main()
