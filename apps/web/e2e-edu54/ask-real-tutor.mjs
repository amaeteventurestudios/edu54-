import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const creds = readFileSync("/srv/ai-node/storage/ssd/edu54/secrets/demo-accounts.txt", "utf8");
const pw = creds.split("## ").find((b) => b.startsWith("edu54-uni")).match(/^adaeze: (\S+)/m)[1];
const b = await chromium.launch({ executablePath: process.env.CHROME });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => localStorage.setItem("umanah.tour.off", "1"));
const outside = []; p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 300)); }); p.on("pageerror", (e) => console.log("PAGEERROR", e.message.slice(0, 300))); p.on("request", (r) => { if (!/192\.168\.4\.41|127\.0\.0\.1|^data:|^blob:/.test(r.url())) outside.push(r.url()); });
await p.goto("http://192.168.4.41:8350/");
await p.getByLabel("Username").fill("adaeze"); await p.getByLabel("Password or PIN").fill(pw);
await p.getByRole("button", { name: "Sign in" }).click();
await p.getByRole("link", { name: "Ask", exact: true }).first().click();
const box = p.getByLabel("Message to the tutor"); await box.fill("In one short paragraph, what is a derivative in calculus?"); await box.press("Enter");
const t0 = Date.now();
try { await p.waitForFunction(() => /rate|slope|change/i.test(document.querySelector("main")?.innerText.split("derivative in calculus?").pop() ?? ""), null, { timeout: 180000 }); } catch (e) { await p.screenshot({ path: "/tmp/claude-1000/ask-fail.png" }); console.log(await p.locator("main").innerText()); throw e; }
await p.waitForTimeout(8000);
await p.screenshot({ path: "/srv/ai-node/storage/ssd/edu54/exports/screenshots/university/60-ask-real-tutor.png" });
console.log("answered in", Math.round((Date.now() - t0) / 1000), "s; outside requests:", outside.length);
await b.close();
