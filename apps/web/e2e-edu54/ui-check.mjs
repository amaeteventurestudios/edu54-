// Desktop and phone check of the 2026-10-10 screens on a local EDU54 instance (stub tutor):
//   node e2e-edu54/ui-check.mjs <base-url> <k12|university> <password> <screenshot-dir>
// For each page: no sideways scroll, no page errors, no excluded source names, no "Umanah". Prints one line per page.
import { chromium } from "@playwright/test";

const [base, edition, pw, out] = process.argv.slice(2);
const K12 = edition === "k12";
const people = K12
  ? { student: ["kofi", "ama", "chidi", "fatima"], staff: "mrsadeyemi" }
  : { student: ["kwame"], staff: "drasante" };
const studentPages = ["/", "/learn", "/learn?tab=practice", "/build", "/explore", "/progress"];
const staffPages = K12 ? ["/teacher", "/school", "/teacher/students", "/teacher/curriculum", "/teacher/view-as", "/teacher/resources", "/explore?cat=teachers"]
  : ["/teacher", "/teacher/students", "/teacher/curriculum", "/teacher/resources"];
const BANNED = /Khan|BLOSSOMS|CK-12|\bTED\b|Umanah|Reeborg/;
const sizes = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };
let bad = 0;

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
for (const [size, viewport] of Object.entries(sizes)) {
  const check = async (page, name) => {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth, text: document.body.innerText }));
    const banned = r.text.match(/Khan|BLOSSOMS|CK-12|\bTED\b|Umanah|Reeborg/);
    const ok = r.sw <= r.w && !banned;
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${edition} ${size} ${name}${r.sw > r.w ? ` sideways scroll ${r.sw}>${r.w}` : ""}${banned ? ` shows "${banned[0]}"` : ""}`);
    await page.screenshot({ path: `${out}/${edition}-${size}-${name.replace(/[/?=]/g, "_") || "home"}.png`, fullPage: false });
  };
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/login");
  await check(page, "login-student");
  await page.getByRole("radio", { name: K12 ? "Teacher or staff" : "Lecturer or staff" }).click();
  await check(page, "login-staff");
  for (const who of [...people.student, people.staff]) {
    await ctx.clearCookies();
    await page.goto(base + "/login");
    await page.fill("#u", who);
    await page.fill("#p", pw);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
    const skip = page.getByRole("button", { name: "Skip the tour" });               // the first-visit tour covers the page
    if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) await skip.click();
    const pages = who === people.staff ? staffPages : who === people.student[0] ? studentPages : ["/"];
    for (const p of pages) { await page.goto(base + p); await check(page, `${who}${p}`); }
    if (who === people.staff) {
      const r = await page.request.get(base + "/api/teacher/students");
      const id = (await r.json()).students[0].id;
      await page.goto(`${base}/teacher/students/${id}`);
      await page.getByText("Suggested next step").waitFor();
      await check(page, `${who}/student-page`);
    }
  }
  if (errors.length) { bad++; console.log(`FAIL ${edition} ${size} page errors: ${errors.slice(0, 3).join(" | ")}`); }
  await ctx.close();
}
await browser.close();
console.log(bad ? `${bad} problem(s)` : "all pages ok");
process.exit(bad ? 1 : 0);
