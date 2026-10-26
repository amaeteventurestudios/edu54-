// Public try-it demo (docs/46), on its own server (port 8104, demo mode on, no real users signed in).
import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://127.0.0.1:8104" });

test("Try as a student: no password, banner on every screen, own copy, then Try as a teacher", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Just looking? Try the demo" })).toBeVisible();
  await page.getByRole("button", { name: "Try as a student" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Jordan" })).toBeVisible();
  const banner = page.getByRole("region", { name: "Demo notice" });
  for (const path of ["/", "/ask", "/learn", "/revision", "/build", "/explore", "/progress"]) {
    await page.goto(path);
    await expect(banner).toContainText("Demo with sample data");
  }
  // the student really talks to the tutor and the chat shows up in the sidebar
  await page.goto("/ask");
  await page.getByLabel("Message to the tutor").fill("What is a variable?");
  await page.getByLabel("Message to the tutor").press("Enter");
  await expect(page.getByRole("complementary", { name: "Main navigation" }).getByRole("link", { name: "What is a variable" })).toBeVisible({ timeout: 20_000 });
  // no admin area, no password sign-in
  const r = await page.request.get("/api/admin/overview");
  expect(r.status()).toBe(403);
  // switch to the teacher view: same visitor copy, so the visitor's chat is still visible to the teacher only if it is assignment-linked
  await banner.getByRole("button", { name: "See the teacher view" }).click();
  await expect(page.getByRole("heading", { name: "Teacher Center" })).toBeVisible();
  await expect(banner).toContainText("Demo with sample data");
  await expect(page.getByRole("link", { name: "Safety Alerts" })).toHaveCount(0);
});

test("Try as a teacher, then Start over", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try as a teacher" }).click();
  await expect(page.getByRole("heading", { name: "Teacher Center" })).toBeVisible();
  await expect(page.getByText("Period 3").first()).toBeVisible();
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByRole("heading", { name: /Welcome back|Teacher Center/ })).toBeVisible();
});

test("two visitors never see each other's work", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  for (const p of [a, b]) { await p.goto("/"); await p.getByRole("button", { name: "Try as a student" }).click(); await expect(p.getByRole("heading", { name: /Welcome back/ })).toBeVisible(); }
  await a.goto("/ask");
  await a.getByLabel("Message to the tutor").fill("Only visitor A asked this");
  await a.getByLabel("Message to the tutor").press("Enter");
  await expect(a.getByRole("complementary", { name: "Main navigation" }).getByRole("link", { name: "Only visitor A asked this" })).toBeVisible({ timeout: 20_000 });
  await b.goto("/ask");
  await expect(b.getByRole("complementary", { name: "Main navigation" }).getByRole("link", { name: "Only visitor A asked this" })).toHaveCount(0);
});
