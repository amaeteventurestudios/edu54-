import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

// Both EDU54 editions: sign in as every role, open every nav item, and check the rendered pages never show the word
// Umanah (outside Attributions), a third-party engine or model name, or an excluded source (docs/edu54/CLAUDE.md §2, §6).
const HOST = process.env.EDU54_HOST || "http://192.168.4.41";
const SHOTS = process.env.EDU54_SHOTS || "/srv/ai-node/storage/ssd/edu54/exports/screenshots";
const creds = readFileSync(process.env.EDU54_CREDENTIALS || "/srv/ai-node/storage/ssd/edu54/secrets/demo-accounts.txt", "utf8");

function logins(instance: string): Record<string, string> {
  const block = creds.split("## ").find((b) => b.startsWith(instance)) ?? "";
  return Object.fromEntries(block.split("\n").filter((l) => /^[a-z]+: /.test(l)).map((l) => { const [u, rest] = l.split(": "); return [u, rest.split(/\s+/)[0]]; }));
}

const FORBIDDEN = [/umanah/i, /\bollama\b/i, /\bkolibri\b/i, /\bkiwix\b/i, /\bqwen\b/i, /\bllama\b/i, /\bjupyter/i, /khan academy/i, /\bcs50\b/i, /harvard/i,
  /opencourseware/i, /code\.org/i, /fast\.ai/i, /geogebra/i, /desmos/i, /wolfram/i, /\bmatlab\b/i, /ck-?12/i, /\bted-ed\b/i, /\bscratch\b/i, /kaggle/i, /youtube/i];

async function clean(page: Page, where: string) {
  const text = await page.locator("body").innerText();
  for (const re of FORBIDDEN) expect(text, `${where}: ${re}`).not.toMatch(re);
  expect(await page.title(), where).not.toMatch(/umanah/i);
}

async function signIn(page: Page, base: string, user: string, pw: string) {
  await page.addInitScript(() => { try { localStorage.setItem("umanah.tour.off", "1"); } catch { /* */ } });
  await page.goto(base + "/");
  await page.getByLabel("Username").fill(user);
  await page.getByLabel("Password or PIN").fill(pw);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("complementary", { name: "Main navigation" })).toBeVisible({ timeout: 30_000 });
}

for (const [instance, port, ed] of [["edu54-k12", 8300, "k12"], ["edu54-uni", 8350, "university"]] as const) {
  const base = `${HOST}:${port}`;
  const L = logins(instance);
  const staff = ed === "k12" ? { teacher: "mrsadeyemi", safety: "mrsotieno", center: "Teacher Center", group: "Classes" } : { teacher: "drasante", safety: "mrsokonkwo", center: "Lecturer Center", group: "Courses" };
  const student = ed === "k12" ? "kofi" : "kwame";

  test.describe(instance, () => {
    test.beforeAll(() => mkdirSync(`${SHOTS}/${ed}`, { recursive: true }));

    test("sign-in page is EDU54-branded", async ({ page }) => {
      await page.goto(base + "/");
      await expect(page.getByText("EDU54").first()).toBeVisible();
      await expect(page).toHaveTitle(/EDU54/);
      await clean(page, "login");
      await page.screenshot({ path: `${SHOTS}/${ed}/00-login.png` });
    });

    test("student: every nav item loads", async ({ page }) => {
      await signIn(page, base, student, L[student]);
      for (const [i, item] of ["Home", "AI Tutor", "Learn", "Practice", "Create", "Explore", "Progress"].entries()) {
        await page.getByRole("complementary", { name: "Main navigation" }).getByRole("link", { name: item, exact: true }).click();
        await page.waitForLoadState("networkidle");
        await expect(page.locator("main h1").first()).toBeVisible();
        await clean(page, `${ed} student ${item}`);
        await page.screenshot({ path: `${SHOTS}/${ed}/1${i}-student-${item.toLowerCase()}.png` });
      }
    });

    test("teacher or lecturer: center uses the edition's words", async ({ page }) => {
      await signIn(page, base, staff.teacher, L[staff.teacher]);
      const nav = page.getByRole("complementary", { name: "Main navigation" });
      await expect(nav.getByRole("link", { name: staff.center })).toBeVisible();
      for (const [i, item] of [staff.center, staff.group, "Assignments", "Students", "Knowledge Library"].entries()) {
        await nav.getByRole("link", { name: item, exact: true }).click();
        await page.waitForLoadState("networkidle");
        await clean(page, `${ed} teacher ${item}`);
        await page.screenshot({ path: `${SHOTS}/${ed}/2${i}-teacher-${item.toLowerCase().replace(/ /g, "-")}.png` });
      }
      if (ed === "university") { await nav.getByRole("link", { name: staff.center }).click(); await page.waitForLoadState("networkidle"); expect(await page.locator("body").innerText()).not.toMatch(/Teacher|\bClass(es)?\b/); }
    });

    test("admin and safety contact", async ({ page }) => {
      await signIn(page, base, "admin", L.admin);
      const nav = page.getByRole("complementary", { name: "Main navigation" });
      for (const [i, item] of ["Overview", "People", staff.group, "Safety Contacts", "Services", "Audit Log"].entries()) {
        await nav.getByRole("link", { name: item, exact: true }).click();
        await page.waitForLoadState("networkidle");
        await clean(page, `${ed} admin ${item}`);
        await page.screenshot({ path: `${SHOTS}/${ed}/3${i}-admin-${item.toLowerCase().replace(/ /g, "-")}.png` });
      }
      await page.getByRole("link", { name: "Lab Status" }).click();
      await expect(page.getByText("About this device")).toBeVisible();
      await clean(page, `${ed} lab status`);
      await page.screenshot({ path: `${SHOTS}/${ed}/39-lab-status.png` });
      await page.context().clearCookies();
      await signIn(page, base, staff.safety, L[staff.safety]);
      await page.getByRole("link", { name: "Safety Alerts" }).click();
      await page.waitForLoadState("networkidle");
      await clean(page, `${ed} safety`);
      await page.screenshot({ path: `${SHOTS}/${ed}/40-safety-alerts.png` });
    });

    test("Build tools open offline under the page's security policy", async ({ page }) => {
      const tools = ed === "k12" ? ["/play/blockly-games/index.html", "/play/snap/snap.html", "/play/musicblocks/index.html"]
        : ["/play/circuitjs/circuitjs.html", "/play/jsmol/index.html", "/play/glowscript/index.html", "/play/jupyterlite/lab/index.html"];
      const outside: string[] = [], csp: string[] = [];
      page.on("request", (r) => { const u = new URL(r.url()); if (!["192.168.4.41", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) outside.push(r.url()); });
      page.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) csp.push(m.text()); });
      await page.route(/^https?:\/\/(?!192\.168\.4\.41|127\.0\.0\.1)/, (r) => r.abort());
      for (const [i, t] of tools.entries()) {
        const res = await page.goto(base + t);
        expect(res?.status(), t).toBe(200);
        await page.waitForTimeout(t.includes("jupyterlite") || t.includes("musicblocks") ? 20_000 : 6_000);
        await page.screenshot({ path: `${SHOTS}/${ed}/5${i}-tool-${t.split("/")[2]}.png` });
      }
      console.log(`${ed}: requests leaving the box (blocked): ${outside.length ? outside.join(", ") : "none"}; CSP messages: ${csp.length}`);
      expect(csp.filter((m) => !/planet|kokoro|jsdelivr/i.test(m)), csp.join("\n")).toEqual([]);
    });

    test("catalog and config APIs carry no excluded source", async ({ request }) => {
      const cfg = await (await request.get(base + "/api/config/public")).text();
      const att = await (await request.get(base + "/api/config/attributions")).text();
      for (const re of FORBIDDEN.slice(7)) { expect(cfg).not.toMatch(re); expect(att).not.toMatch(re); }
      expect(cfg).not.toMatch(/umanah/i);
    });
  });
}
