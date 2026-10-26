// Grade-aware Student Home: sign in as one learner per band (K-12) and one University student, screenshot each Home,
// read the sidebar badge and nav, and open the teacher's "View as" previews.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const creds = readFileSync("/srv/ai-node/storage/ssd/edu54/secrets/demo-accounts.txt", "utf8");
const pw = (inst, u) => creds.split("## ").find((b) => b.startsWith(inst)).match(new RegExp(`^${u}: (\\S+)`, "m"))[1];
const OUT = "/srv/ai-node/storage/ssd/edu54/exports/screenshots";
const b = await chromium.launch({ executablePath: process.env.CHROME });
async function signIn(port, inst, u) {
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.addInitScript(() => localStorage.setItem("umanah.tour.off", "1"));
  await p.goto(`http://192.168.4.41:${port}/`);
  await p.getByLabel("Username").fill(u); await p.getByLabel("Password or PIN").fill(pw(inst, u));
  await p.getByRole("button", { name: "Sign in" }).click();
  await p.getByRole("complementary", { name: "Main navigation" }).waitFor({ timeout: 60000 });
  await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
  return p;
}
for (const [port, inst, u, ed, n] of [[8300, "edu54-k12", "ama", "k12", "a-discover"], [8300, "edu54-k12", "chidi", "k12", "b-explore"], [8300, "edu54-k12", "kofi", "k12", "c-build"], [8300, "edu54-k12", "fatima", "k12", "d-launch"], [8350, "edu54-uni", "kwame", "university", "e-university"]]) {
  const p = await signIn(port, inst, u);
  const nav = await p.getByRole("complementary", { name: "Main navigation" }).locator("nav").first().innerText();
  const badge = await p.getByLabel("Your level").innerText().catch(() => "(none)");
  const h1 = await p.locator("main h1, main [class*='font-serif']").first().innerText();
  console.log(u, "|", badge.replace(/\n/g, " / "), "|", nav.replace(/\n/g, ", "), "|", h1.slice(0, 60));
  await p.screenshot({ path: `${OUT}/${ed}/70-home-${n}.png`, fullPage: true });
  await p.close();
}
const t = await signIn(8300, "edu54-k12", "mrsadeyemi");
const views = await t.getByRole("navigation", { name: "View as a learner" }).innerText();
console.log("teacher view-as:", views.replace(/\n/g, " "));
await t.getByRole("link", { name: /Discover/ }).click(); await t.waitForLoadState("networkidle"); await t.waitForTimeout(1000);
console.log("preview:", (await t.getByRole("status").first().innerText()).slice(0, 90));
await t.screenshot({ path: `${OUT}/k12/71-teacher-preview-discover.png`, fullPage: true });
await b.close();
