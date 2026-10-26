// Evidence pack for the owner's review (1366x768): docs/media/screens/review/
//   node e2e/review.mjs [base=http://127.0.0.1:8103] [demoBase=http://127.0.0.1:8107]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
const base = process.argv[2] || "http://127.0.0.1:8103", demo = process.argv[3] || "http://127.0.0.1:8107", pw = "shots-password-1";
const out = path.resolve(import.meta.dirname, "../../../docs/media/screens/review"); mkdirSync(out, { recursive: true });
const b = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const ctxFor = async (tour = false) => { const c = await b.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: "reduce" }); if (!tour) await c.addInitScript(() => { try { localStorage.setItem("umanah.tour.off", "1"); } catch {} }); return c.newPage(); };
const shot = async (p, name) => { await p.waitForTimeout(1200); await p.screenshot({ path: path.join(out, `${name}.png`) }); console.log("saved", name); };
async function login(p, u, root = base, wait = true) { await p.goto(root + "/"); await p.getByLabel("Username").fill(u); await p.getByLabel("Password or PIN").fill(pw); await p.getByRole("button", { name: "Sign in" }).click(); if (wait) await p.getByRole("button", { name: "Account menu" }).waitFor(); }

// A: where each role lands after signing in
for (const [u, name] of [["jordan", "A-landing-student"], ["mswilliams", "A-landing-teacher"], ["admin", "A-landing-admin"]]) { const p = await ctxFor(); await login(p, u); await shot(p, name); await p.context().close(); }

// C: an Ask answer with bold, a numbered list and a formula
{ const p = await ctxFor(); await login(p, "jordan"); await p.goto(base + "/ask");
  await p.getByLabel("Search your chats").fill("Multiplying"); await p.getByRole("link", { name: "Multiplying 12 by 3" }).click(); await p.locator(".katex").first().waitFor(); await p.evaluate(() => { document.querySelector(".sidebar-scroll").scrollTop = 0; }); await shot(p, "C-ask-bold-list-formula"); await p.context().close(); }

// D: Build with the AI Helper panel and the "help me understand" error button
{ const p = await ctxFor(); await login(p, "jordan"); await p.goto(base + "/build"); await p.locator(".cm-content").click();
  await p.keyboard.press("Control+A"); await p.keyboard.type("print(total)"); await p.getByRole("button", { name: "Run" }).first().click();
  await p.getByRole("button", { name: "Help me understand this error" }).waitFor({ timeout: 60000 }); await shot(p, "D-build-helper-and-error-button"); await p.context().close(); }

// E: admin People, Classes, Audit Log; teacher adds a student and prints login cards
{ const p = await ctxFor(); await login(p, "admin"); for (const [r, n] of [["/admin/people", "E-admin-people"], ["/admin/classes", "E-admin-classes"], ["/admin/audit", "E-admin-audit-log"]]) { await p.goto(base + r); await shot(p, n); } await p.context().close(); }
{ const p = await ctxFor(); await login(p, "mswilliams"); await p.goto(base + "/teacher/classes");
  await p.getByRole("button", { name: "Add student" }).first().click(); await p.getByLabel("Full name").fill("Sam Example"); await shot(p, "E-teacher-add-student");
  await p.getByRole("button", { name: /Add student/ }).last().click(); await p.getByRole("button", { name: "Print login cards" }).waitFor(); await shot(p, "E-teacher-login-cards-dialog");
  await p.emulateMedia({ media: "print" }); await p.screenshot({ path: path.join(out, "E-teacher-login-cards-print-preview.png") }); console.log("saved print preview"); await p.context().close(); }

// F: user menu, first-sign-in tour, and dark mode (there is none)
{ const p = await ctxFor(true); await login(p, "student05", base, false); await p.getByRole("dialog").waitFor(); await shot(p, "F-first-login-tour"); await p.getByRole("button", { name: "Skip the tour" }).click();
  await p.getByRole("button", { name: "Account menu" }).click(); await shot(p, "F-user-menu-no-dark-mode-toggle"); await p.context().close(); }

// G: the public demo landing with its banner
{ const p = await ctxFor(); await p.goto(demo + "/"); await shot(p, "G-demo-login-page"); await p.getByRole("button", { name: /Try as a student/ }).click(); await p.getByRole("button", { name: "Account menu" }).waitFor(); await shot(p, "G-try-as-student-landing"); await p.context().close(); }

// H: the public website (live)
{ const p = await ctxFor(); await p.goto("https://www.umanah.org/"); await p.waitForTimeout(800); await p.screenshot({ path: path.join(out, "H-umanah-home-nav.png"), clip: { x: 0, y: 0, width: 1366, height: 200 } });
  await p.goto("https://www.umanah.org/ai-lab"); await p.waitForTimeout(1500); await p.screenshot({ path: path.join(out, "H-ai-lab-full-page.png"), fullPage: true }); console.log("saved H"); await p.context().close(); }
await b.close();
