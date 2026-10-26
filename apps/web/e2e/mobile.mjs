// Mobile pass: every main screen at 390x844 and 360x800 as student, teacher and admin, plus the sign-in page and the demo banner.
//   node e2e/mobile.mjs <tag: before|after> [base=http://127.0.0.1:8103] [demoBase=http://127.0.0.1:8107]
// Saves docs/media/screens/mobile/<tag>/<WxH>/<name>.png and prints horizontal overflow and small tap targets (< 44 px).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const tag = process.argv[2] || "after", base = process.argv[3] || "http://127.0.0.1:8103", demo = process.argv[4] || "http://127.0.0.1:8107";
const pw = process.env.UMANAH_SHOTS_PASSWORD || "shots-password-1";
const out = path.resolve(import.meta.dirname, "../../../docs/media/screens/mobile", tag);
const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const sizes = [[390, 844], [360, 800]];
const plan = {
  jordan: [["home", "/"], ["ask", "/ask"], ["learn", "/learn"], ["revision", "/revision"], ["build", "/build"], ["explore", "/explore"], ["progress", "/progress"], ["lab-status", "/status"], ["settings", "/settings"], ["lesson", "/learn/lessons/py-l6"]],
  mswilliams: [["teacher-center", "/teacher"], ["teacher-students", "/teacher/students"], ["teacher-assignments", "/teacher/assignments"], ["teacher-settings", "/settings"]],
  admin: [["admin", "/admin"], ["admin-people", "/admin/people"], ["admin-settings", "/admin/settings"], ["admin-audit", "/admin/audit"]],
};
const metrics = async (page) => page.evaluate(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && r.bottom > 0; };
  const small = [...document.querySelectorAll("button, a[href], [role=button], input:not([type=hidden]), select, textarea, [role=tab], [role=menuitem]")]
    .filter(vis).filter((e) => !e.closest("p, li.prose, .tutor-md, .prose") || e.tagName !== "A").filter((e) => !(e.tagName === "A" && e.textContent.trim() === "Skip to content"))
    .map((e) => { const r = e.getBoundingClientRect(); return { r, e }; }).filter(({ r }) => r.height < 43.5 || r.width < 43.5)
    .map(({ r, e }) => `${e.tagName.toLowerCase()}[${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 24)}] ${Math.round(r.width)}x${Math.round(r.height)}`);
  return { overflowX: document.documentElement.scrollWidth - innerWidth, small };
});
const browser = await chromium.launch({ headless: true, executablePath: exe });
async function shot(page, w, h, name) {
  const dir = path.join(out, `${w}x${h}`); mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(1200);
  const m = await metrics(page);
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
  console.log(`${w}x${h} ${name.padEnd(20)} overflowX=${m.overflowX} small=${m.small.length}${m.small.length ? "  " + m.small.slice(0, 6).join("; ") : ""}`);
}
for (const [w, h] of sizes) {
  const mk = async (b) => { const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: "reduce" }); await ctx.addInitScript(() => { try { localStorage.setItem("umanah.tour.off", "1"); } catch {} }); return ctx.newPage(); };
  let p = await mk();
  await p.goto(base + "/"); await shot(p, w, h, "login");
  for (const [user, routes] of Object.entries(plan)) {
    p = await mk();
    await p.goto(base + "/"); await p.getByLabel("Username").fill(user); await p.getByLabel("Password").fill(pw); await p.getByRole("button", { name: "Sign in" }).click();
    await p.getByRole("button", { name: "Open the menu" }).waitFor({ timeout: 20000 });
    for (const [name, route] of routes) { await p.goto(base + route); await shot(p, w, h, `${user === "jordan" ? "student" : user === "mswilliams" ? "teacher" : "admin"}-${name}`); }
    // the mobile menu
    await p.goto(base + (user === "jordan" ? "/" : user === "admin" ? "/admin" : "/teacher"));
    const menu = p.getByRole("button", { name: /menu/i }).first();
    if (await menu.count()) { await menu.click(); await p.waitForTimeout(500); await shot(p, w, h, `${user === "jordan" ? "student" : user === "mswilliams" ? "teacher" : "admin"}-menu-open`); }
  }
  p = await mk(); await p.goto(demo + "/"); await shot(p, w, h, "demo-login");
  await p.getByRole("button", { name: /Try as a student/i }).click(); await p.getByRole("button", { name: "Open the menu" }).waitFor(); await shot(p, w, h, "demo-student-home");
}
await browser.close();
