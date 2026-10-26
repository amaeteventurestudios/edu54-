// Accessibility pass (docs/49): axe-core on every main screen, WCAG 2 A and AA rules, for each role.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PW = "e2e-password-1";
async function login(page: Page, user: string) {
  await page.goto("/");
  await page.getByLabel("Username").fill(user);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector("aside[aria-label='Main navigation']");
}
async function scan(page: Page, name: string) {
  await page.waitForTimeout(1200);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const bad = r.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.html.slice(0, 140)}`);
  expect(bad, `${name}\n${bad.join("\n")}`).toEqual([]);
}
const sets: [string, string[]][] = [
  ["jordan", ["/", "/ask?c=1", "/learn", "/learn/lessons/py-l6", "/revision", "/build", "/explore", "/progress", "/assignments/asg-loops-practice", "/status", "/settings"]],
  ["mswilliams", ["/teacher", "/teacher/classes", "/teacher/students", "/teacher/curriculum", "/teacher/assignments", "/teacher/school", "/teacher/view-as"]],
  ["admin", ["/admin", "/admin/people", "/admin/classes", "/admin/safety-contacts", "/admin/settings", "/admin/services", "/admin/backups", "/admin/audit"]],
];
for (const [user, paths] of sets) {
  test(`axe: no violations for ${user}`, async ({ page }) => {
    test.setTimeout(240_000);
    if (user === "jordan") { await page.goto("/"); await scan(page, "login page"); }
    await login(page, user);
    for (const p of paths) { await page.goto(p); await scan(page, `${user} ${p}`); }
  });
}
