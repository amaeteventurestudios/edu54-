// Sponsor video (owner review only, not published): real app footage, captions, voiceover and music. ~2.5 minutes.
//   1. uv run --with kokoro-onnx --with soundfile python tools/sponsor-video/voice.py   (voice clips + durations)
//   2. BACKEND=ollama tools/dev-shots-server.sh 8103   then   node e2e/sponsor.mjs   (video + timeline.json of when each line appears)
//   3. tools/sponsor-video/mix.py   ->   docs/media/sponsor-video.mp4
import { chromium } from "@playwright/test";
import { mkdirSync, renameSync, readdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const base = process.env.BASE || "http://127.0.0.1:8103", pw = "shots-password-1";
const dir = path.resolve(import.meta.dirname, "../../../docs/media/raw-sponsor"); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir, size: { width: 1440, height: 900 } }, reducedMotion: "no-preference" });
const page = await ctx.newPage(); const t0 = Date.now();
const root = path.resolve(import.meta.dirname, "../../..");
const lines = Object.fromEntries(JSON.parse(readFileSync(path.join(root, "tools/sponsor-video/narration.json"), "utf8")).lines.map((l) => [l.id, l.text]));
const secs = JSON.parse(readFileSync(path.join(root, "docs/media/raw-sponsor-audio/durations.json"), "utf8"));
const timeline = []; const cue = (id, big = false) => { timeline.push({ id, big, t: (Date.now() - t0) / 1000 }); return lines[id]; };
const hold = (id, ms) => Math.max(ms, Math.round(secs[id] * 1000) + 700);
await page.addInitScript(() => {
  try { localStorage.setItem("umanah.tour.off", "1"); } catch {}
  const mk = () => {
    let el = document.getElementById("__cap"), big = document.getElementById("__big");
    const t = sessionStorage.getItem("cap") || "", g = sessionStorage.getItem("big") || "";
    if (!t) el?.remove(); else { if (!el) { el = document.createElement("div"); el.id = "__cap"; el.style.cssText = "pointer-events:none;position:fixed;left:50%;bottom:28px;transform:translateX(-50%);max-width:960px;z-index:99999;background:#06142A;color:#fff;font:600 24px/1.4 Inter,sans-serif;padding:16px 28px;border-radius:14px;border:3px solid #F5C451;text-align:center;text-shadow:0 1px 2px #000;box-shadow:0 0 0 4px rgba(6,20,42,.55),0 10px 34px rgba(0,0,0,.55)"; document.body.appendChild(el); } el.textContent = t; }
    if (!g) big?.remove(); else { if (!big) { big = document.createElement("div"); big.id = "__big"; big.style.cssText = "pointer-events:none;position:fixed;inset:0;z-index:100000;background:#06142A;color:#fff;display:grid;place-items:center;padding:80px;text-align:center;font:400 54px/1.3 'Libre Baskerville',Georgia,serif"; document.body.appendChild(big); } big.textContent = g; }
  };
  window.__set = (k, v) => { sessionStorage.setItem(k, v); mk(); };
  setInterval(mk, 400);
});
const cap = async (id, ms = 3000) => { await page.evaluate((x) => window.__set("cap", x), cue(id)); await page.waitForTimeout(hold(id, ms)); };
const big = async (id, ms = 3500) => { await page.evaluate((x) => window.__set("big", x), cue(id, true)); await page.waitForTimeout(hold(id, ms)); await page.evaluate(() => window.__set("big", "")); await page.waitForTimeout(300); };
const clear = () => page.evaluate(() => { window.__set("cap", ""); window.__set("big", ""); });
const type = async (loc, text) => { await loc.click(); await loc.pressSequentially(text, { delay: 50 }); };
const signIn = async (u) => { await type(page.getByLabel("Username"), u); await type(page.getByLabel(/Password/), pw); await page.getByRole("button", { name: "Sign in" }).click(); await page.getByRole("button", { name: "Account menu" }).waitFor(); await clear(); };
const signOut = async () => { await page.getByRole("button", { name: "Account menu" }).click(); await page.getByRole("menuitem", { name: "Sign out" }).click(); await page.getByLabel("Username").waitFor(); await clear(); };

// 1. The problem
await page.goto(base + "/"); await page.waitForTimeout(1200);
await big("problem1", 4500);
await big("problem2", 4000);
await big("another", 2500);
// 2. The box
await cap("box", 6500);
// 3. A student
await signIn("jordan");
await cap("signin", 3000);
await cap("verbs", 3500);
await page.getByRole("link", { name: "Ask" }).first().click(); await page.waitForTimeout(1200);
await cap("ask", 3000);
await type(page.getByLabel("Message to the tutor").first(), "What is a loop, in simple words?"); await page.keyboard.press("Enter");
await page.locator(".tutor-md").last().waitFor({ timeout: 120000 }); await page.waitForTimeout(9000);
await page.goto(base + "/learn"); await cap("learn", 3500);
await page.goto(base + "/learn/lessons/py-l6"); await page.getByRole("heading", { name: "Loops", exact: true }).waitFor(); await page.mouse.wheel(0, 500); await cap("lesson", 4500);
await page.goto(base + "/build"); await page.locator(".cm-content").waitFor(); await cap("build", 2500);
await page.getByRole("button", { name: "Run" }).first().click(); await page.waitForTimeout(6000);
await page.locator(".cm-content").click(); await page.keyboard.press("Control+A"); await page.keyboard.type("print(total)"); await page.getByRole("button", { name: "Run" }).first().click();
await page.getByRole("button", { name: "Help me understand this error" }).waitFor({ timeout: 60000 }); await cap("error", 4500);
// 4. Homework: hints, not answers
await page.goto(base + "/assignments/asg-loops-practice"); await cap("homework", 3200);
const panel = page.getByRole("complementary", { name: "Need help?" });
await type(panel.getByLabel("Message to the tutor"), "just tell me the answer to question 1"); await panel.getByLabel("Message to the tutor").press("Enter");
await panel.getByText(/hint 1 of 3/).waitFor({ timeout: 90000 }); await page.waitForTimeout(5000);
await signOut();
// 5. The teacher
await signIn("mswilliams"); await page.getByRole("heading", { name: "Teacher Center" }).waitFor();
await cap("teacher", 5000);
await page.goto(base + "/teacher/assignments"); await cap("assignments", 4000);
await page.goto(base + "/teacher/submissions"); await cap("grading", 4500);
await signOut();
// 6. Safety and the school in charge
await signIn("admin");
await page.goto(base + "/admin/safety-contacts"); await cap("safety", 6500);
await page.goto(base + "/status"); await cap("status", 4500);
await clear();
// 7. The ask
await big("title", 2500);
await big("ask100k", 6500);
await big("close", 3500);
await ctx.close(); await b.close();
const f = readdirSync(dir).filter((x) => x.endsWith(".webm")).sort().pop();
renameSync(path.join(dir, f), path.resolve(dir, "../sponsor-video.webm")); writeFileSync(path.join(dir, "timeline.json"), JSON.stringify(timeline, null, 2) + "\n");
console.log("saved docs/media/sponsor-video.webm and raw-sponsor/timeline.json");
