import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

// EDU54 Workbench (docs/edu54-build): sign in, open /ai-build, open a lesson, finish its checks, and see it saved to the
// learner's account. The lessons are copied in by tools/content/sync-edu54-build.sh; without them this test is skipped.
const PW = "e2e-password-1";
const SITE = new URL("../../../content/edu54-build/site/index.html", import.meta.url).pathname;

test.describe("EDU54 Workbench", () => {
  test.skip(!existsSync(SITE), "the lessons are not synced into content/edu54-build/site");

  test("a finished lesson is saved to the learner's account, and nothing leaves the box", async ({ page }) => {
    const outside: string[] = [];
    page.on("request", (r) => { if (!r.url().startsWith("http://127.0.0.1:")) outside.push(r.url()); });
    await page.goto("/ai-build");
    await page.getByLabel("Username").fill("jordan");
    await page.getByLabel("Password").fill(PW);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Build AI from scratch. In 3D." })).toBeVisible();
    await expect(page.getByText("EDU54 Workbench · 667 lessons · 12 tracks")).toBeVisible();

    await page.getByPlaceholder(/Search 667 lessons/).fill("how alike");
    await page.getByRole("link", { name: /Vectors: how alike are two things\?/ }).click();
    await expect(page).toHaveURL(/\/ai-build\/lessons\/vectors\/$/);
    await page.waitForFunction(() => (window as unknown as { __build?: unknown }).__build, null, { timeout: 60_000 });
    await expect(page.locator(".brand-name")).toHaveText("EDU54 Workbench");
    await expect(page.locator("a.brand")).toHaveAttribute("href", "/ai-build");

    const answers = await page.evaluate(() => (window as unknown as { __build: { L: { check: { answer: number }[] } } }).__build.L.check.map((c) => c.answer));
    for (const [k, a] of answers.entries()) await page.evaluate(([k, a]) => (document.querySelector(`.cq[data-q="${k}"] button[data-opt="${a}"]`) as HTMLButtonElement).click(), [k, a]);
    await expect.poll(async () => (await page.request.get("/api/ai-build/progress")).json().then((j) => j.lessons), { timeout: 15_000 }).toContain("vectors");

    await page.goto("/ai-build");
    await expect(page.getByText("You've finished 1 of 667 lessons.")).toBeVisible();
    expect(outside).toEqual([]);
  });
});
