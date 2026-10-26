// Staff views: School by Grade (admin sees all four bands, teacher only her class) and one learner's picture.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const creds = readFileSync("/srv/ai-node/storage/ssd/edu54/secrets/demo-accounts.txt", "utf8");
const pw = (u) => creds.split("## ").find((b) => b.startsWith("edu54-k12")).match(new RegExp(`^${u}: (\\S+)`, "m"))[1];
const OUT = "/srv/ai-node/storage/ssd/edu54/exports/screenshots/k12";
const b = await chromium.launch({ executablePath: process.env.CHROME });
for (const u of ["admin", "mrsadeyemi"]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.addInitScript(() => localStorage.setItem("umanah.tour.off", "1"));
  await p.goto("http://192.168.4.41:8300/");
  await p.getByLabel("Username").fill(u); await p.getByLabel("Password or PIN").fill(pw(u));
  await p.getByRole("button", { name: "Sign in" }).click();
  const nav = p.getByRole("complementary", { name: "Main navigation" });
  await nav.getByRole("link", { name: u === "admin" ? "School by Grade" : "By Grade" }).click();
  await p.getByRole("heading", { name: "School by Grade" }).waitFor({ timeout: 30000 });
  await p.waitForLoadState("networkidle");
  const groups = await p.locator("main section h2").allInnerTexts();
  console.log(u, "groups:", groups.join(" | "));
  await p.screenshot({ path: `${OUT}/80-school-by-grade-${u}.png`, fullPage: true });
  if (u === "mrsadeyemi") {
    await p.getByRole("link", { name: /Kofi Mensah/ }).click();
    await p.getByRole("heading", { name: "Kofi Mensah" }).waitFor({ timeout: 30000 }); await p.waitForLoadState("networkidle");
    console.log("learner:", (await p.getByLabel("Suggested next step").innerText()).replace(/\n/g, " ").slice(0, 160));
    await p.screenshot({ path: `${OUT}/81-learner-kofi.png`, fullPage: true });
  }
  await p.close();
}
await b.close();
