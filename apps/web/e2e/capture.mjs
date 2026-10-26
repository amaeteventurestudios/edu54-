// Screenshots each slice screen at 1440x900 for the side-by-side comparison with design/reference (docs/44 "Visual bar").
//   node e2e/capture.mjs [base-url]      credentials: UMANAH_CREDENTIALS (default ~/umanah-dev-data/demo-credentials.txt)
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const base = process.argv[2] || "http://127.0.0.1:8101";
const credsFile = process.env.UMANAH_CREDENTIALS || path.join(homedir(), "umanah-dev-data", "demo-credentials.txt");
const creds = Object.fromEntries(readFileSync(credsFile, "utf8").split("\n").filter((l) => l.includes(": ") && !l.startsWith("#")).map((l) => l.split(": ")));
const out = path.resolve(import.meta.dirname, "../../../design/compare/ours");
mkdirSync(out, { recursive: true });

const shots = {
  jordan: [["01-home", "/"], ["02-ask", "/ask"], ["03-learn", "/learn"], ["04-lesson", "/learn/lessons/py-l6"], ["05-homework", "/assignments/asg-loops-practice"], ["07-build", "/build"], ["09-progress", "/progress"]],
  mswilliams: [["10-teacher", "/teacher"], ["10b-submission", null]],
  msrivera: [["11-safety", "/safety"]],
};
const only = process.env.ONLY?.split(",");
const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browser = await chromium.launch({ headless: true, ...(exe ? { executablePath: exe } : {}) });
for (const [user, list] of Object.entries(shots)) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(base + "/");
  await page.getByLabel("Username").fill(user);
  await page.getByLabel("Password").fill(creds[user]);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector("aside[aria-label='Main navigation']");
  for (const [name, route] of list) {
    if (only && !only.includes(name)) continue;
    if (route === null) {
      await page.goto(base + "/teacher");
      await page.locator("a[href^='/teacher/submissions/']").first().click();
    } else await page.goto(base + route);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(out, `${name}.png`) });
    console.log("saved", name);
  }
  await ctx.close();
}
await browser.close();
