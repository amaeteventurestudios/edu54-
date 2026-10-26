// Screenshots screens at 1440x900 and 1366x768.
//   SHOTS='jordan:home:/,jordan:ask:/ask' OUT=docs/media/screens/A node e2e/shots.mjs [base-url]
// Passwords: UMANAH_SHOTS_PASSWORD (dev-shots-server default) for every account.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const base = process.argv[2] || "http://127.0.0.1:8103";
const pw = process.env.UMANAH_SHOTS_PASSWORD || "shots-password-1";
const out = path.resolve(process.env.OUT || "../../docs/media/screens");
const list = (process.env.SHOTS || "").split(",").filter(Boolean).map((s) => { const [u, n, ...r] = s.split(":"); return [u, n, r.join(":")]; });
const sizes = [[1440, 900], [1366, 768]];
const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || `${process.env.HOME}/.cache/ms-playwright/chromium-1187/chrome-linux/chrome`;
const browser = await chromium.launch({ headless: true, executablePath: exe });
const users = [...new Set(list.map((l) => l[0]))];
for (const user of users) {
  for (const [w, h] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    await ctx.addInitScript(() => { try { localStorage.setItem("umanah.tour.off", "1"); } catch {} });   // no first-sign-in tour over the shots
    const page = await ctx.newPage();
    await page.goto(base + "/");
    await page.getByLabel("Username").fill(user);
    await page.getByLabel("Password").fill(pw);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForSelector("aside[aria-label='Main navigation']");
    for (const [u, name, route] of list) {
      if (u !== user) continue;
      await page.goto(base + route);
      await page.waitForTimeout(1500);
      const dir = path.join(out, `${w}x${h}`); mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, `${name}.png`) });
      console.log("saved", `${w}x${h}`, name);
    }
    await ctx.close();
  }
}
await browser.close();
