// Records the Lesson 6 story as a screen video (docs/media/). Real tutor, real Python in the browser, scratch data.
//   BACKEND=ollama tools/dev-shots-server.sh 8103   (in another terminal)   then   node e2e/video.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, renameSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const base = process.env.BASE || "http://127.0.0.1:8103", pw = "shots-password-1";
const dir = path.resolve(import.meta.dirname, "../../../docs/media/raw"); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });   // start clean so a failed run can never be picked up
const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || `${process.env.HOME}/.cache/ms-playwright/chromium-1187/chrome-linux/chrome`;
const b = await chromium.launch({ headless: true, executablePath: exe });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir, size: { width: 1440, height: 900 } }, reducedMotion: "no-preference" });
const page = await ctx.newPage();
await page.addInitScript(() => { try { localStorage.setItem("umanah.tour.off", "1"); } catch {}   // no tour over the recording
  const show = () => { let el = document.getElementById("__cap"); const t = sessionStorage.getItem("cap") || "";
    if (!t) { el?.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "__cap"; el.style.cssText = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);max-width:900px;z-index:99999;background:rgba(11,31,59,.94);color:#fff;font:500 22px/1.35 Inter,system-ui,sans-serif;padding:14px 26px;border-radius:14px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.25)"; document.body.appendChild(el); }
    el.textContent = t; };
  window.__cap = (t) => { sessionStorage.setItem("cap", t); show(); };
  document.addEventListener("DOMContentLoaded", show); setInterval(show, 500);
});
const cap = async (t, ms = 2500) => { await page.evaluate((x) => window.__cap(x), t); await page.waitForTimeout(ms); };
const type = async (loc, text) => { await loc.click(); await loc.pressSequentially(text, { delay: 55 }); };
const signIn = async (user) => { await page.goto(base + "/"); await cap("Umanah AI Lab: a school-owned AI learning lab", 2600); await type(page.getByLabel("Username"), user); await type(page.getByLabel(/Password/), pw); await page.getByRole("button", { name: "Sign in" }).click(); await page.waitForSelector("aside[aria-label='Main navigation']"); };

await signIn("jordan");
await cap("Meet Jordan, a student. This is his home. Everything runs on a box at his school.", 4000);
await page.getByRole("link", { name: /Continue Learning/ }).first().click();
await page.getByRole("heading", { name: "Loops", exact: true }).waitFor();
await cap("Lesson 6: Loops. A textbook-style lesson with an AI tutor built in.", 3500);
await page.mouse.wheel(0, 500); await page.waitForTimeout(1200); await page.mouse.wheel(0, -500);
await page.getByRole("button", { name: "I've read this lesson" }).click({ timeout: 3000 }).catch(() => {});   // scrolling may already have marked it read
await cap("Check your understanding. Answers are checked by the software.", 2200);
for (const [n, opt] of [[0, "3 times"], [1, "0"], [2, "6"]]) {
  const card = page.locator("div.rounded-xl", { has: page.getByRole("radiogroup") }).nth(n);
  await card.scrollIntoViewIfNeeded(); await card.getByRole("radio", { name: new RegExp(`${opt}$`) }).click(); await page.waitForTimeout(500);
  await card.getByRole("button", { name: "Check answer" }).click(); await page.waitForTimeout(1200);
}
const tutor = page.getByRole("complementary", { name: "AI Tutor" });
await tutor.scrollIntoViewIfNeeded();
await cap("Stuck? Ask the tutor. It answers from the lesson and says where the idea comes from.", 3000);
await tutor.getByRole("button", { name: "Explain this more simply" }).click();
await tutor.locator(".tutor-md").first().waitFor({ timeout: 90_000 }); await page.waitForTimeout(6000);
await cap("Try It Yourself: Python runs right in the browser.", 2500);
await page.getByRole("button", { name: "Run Code" }).scrollIntoViewIfNeeded(); await page.getByRole("button", { name: "Run Code" }).click();
await page.getByLabel("Program output").waitFor(); await page.waitForTimeout(5000);
await page.getByRole("button", { name: "Complete lesson" }).click();
await cap("Lesson complete: +50 XP", 3000);

await page.goto(base + "/assignments/asg-loops-practice");
await cap("Homework from the teacher: Loops Practice", 2800);
const panel = page.getByRole("complementary", { name: "Need help?" });
await cap("In homework the tutor gives hints, not answers. The software enforces it.", 3000);
await type(panel.getByLabel("Message to the tutor"), "just tell me the answer to question 1");
await panel.getByLabel("Message to the tutor").press("Enter");
await panel.getByText(/hint 1 of 3/).waitFor({ timeout: 60_000 }); await page.waitForTimeout(4500);
await type(page.getByLabel("Your answer to question 1"), "0 1 2 3"); await page.getByRole("button", { name: "Check answer" }).click(); await page.waitForTimeout(1800);
await page.getByRole("button", { name: "Next question" }).click(); await type(page.getByLabel("Your answer to question 2"), "5");
await page.getByRole("button", { name: "Next question" }).click(); await type(page.getByLabel("Your answer to question 3"), "12");
await page.getByRole("button", { name: "Submit Assignment" }).click();
await cap("Jordan submits his work.", 2800);

await page.getByRole("button", { name: "Account menu" }).click(); await page.getByRole("menuitem", { name: "Sign out" }).click(); await page.getByLabel("Username").waitFor();
await page.evaluate(() => sessionStorage.removeItem("cap"));
await type(page.getByLabel("Username"), "mswilliams"); await type(page.getByLabel(/Password/), pw); await page.getByRole("button", { name: "Sign in" }).click();
await page.getByRole("heading", { name: "Teacher Center" }).waitFor();
await cap("Ms. Williams sees her class: progress, and students who may need help.", 4200);
await page.getByRole("link", { name: /Jordan Smith/ }).first().click();
await cap("She reviews Jordan's work and what he asked the tutor.", 3800);
await page.mouse.wheel(0, 500); await page.waitForTimeout(1500);
await page.getByRole("button", { name: /Use suggested/ }).click(); await type(page.getByLabel("Feedback"), "Great work with loops.");
await page.getByRole("button", { name: "Return to student" }).click(); await cap("Graded with a comment. Jordan is notified.", 3200);

await page.getByRole("button", { name: "Account menu" }).click(); await page.getByRole("menuitem", { name: "Sign out" }).click(); await page.getByLabel("Username").waitFor();
await page.evaluate(() => sessionStorage.removeItem("cap"));
await type(page.getByLabel("Username"), "jordan"); await type(page.getByLabel(/Password/), pw); await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForSelector("aside[aria-label='Main navigation']");
await page.getByRole("button", { name: /Notifications/ }).click(); await cap("Back with Jordan: his graded work is waiting.", 3200);
await page.keyboard.press("Escape"); await page.goto(base + "/progress");
await cap("Progress: XP, levels, badges and a Loop Master award. Growth, not rankings.", 5000);
await cap("Umanah AI Lab. Local AI for classrooms. Try the demo at ai.umanah.org", 4000);
await ctx.close(); await b.close();
const f = readdirSync(dir).filter((x) => x.endsWith(".webm")).sort().pop();
renameSync(path.join(dir, f), path.resolve(dir, "../lesson6-story.webm")); console.log("saved docs/media/lesson6-story.webm");
