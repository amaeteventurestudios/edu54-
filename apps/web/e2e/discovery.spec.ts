import { expect, test } from "@playwright/test";

const PW = "e2e-password-1";

test.describe("Discovery Lab: the same sign-in, local search, experiments and the AI Guide", () => {
  test("opening /discover signed out asks for the school sign-in, then opens Discovery Lab", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.getByTestId("discover-note")).toContainText("same sign-in");
    await page.getByLabel("Username").fill("jordan");
    await page.getByLabel("Password").fill(PW);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "What would you like to explore?" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Mathematics: \d+ ready/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);

    // typeahead search runs in the browser: a typo still finds the experiment
    await page.getByRole("combobox").fill("projectle");
    await expect(page.getByRole("option").first()).toContainText("Projectile motion");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/discover\/physics\/projectile-motion$/);

    // the experiment runs and its readings follow the controls
    const flight = page.getByRole("definition").first();
    const before = await flight.innerText();
    await page.getByRole("slider", { name: "Launch angle" }).fill("30");
    await expect(flight).not.toHaveText(before);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: /Advanced/ }).click();
    await expect(page.getByRole("tabpanel")).toContainText("How this model works");

    // the AI Guide goes through the tutor and sends the experiment's readings with the question
    const sent = page.waitForRequest((r) => r.url().endsWith("/api/ai/chat"));
    await page.getByLabel("Message to the tutor").fill("Why does the angle matter?");
    await page.keyboard.press("Enter");
    const body = JSON.parse((await sent).postData() ?? "{}");
    expect(body.context).toMatchObject({ type: "experiment", id: "projectile-motion", state: { angle: 30 } });
    await expect(page.locator("div[aria-live=polite]").first()).toContainText("one step at a time");          // the stub tutor's reply
  });

  test("a planned experiment does not open; a phone has no sideways scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/discover/chemistry");
    await page.getByLabel("Username").fill("jordan");
    await page.getByLabel("Password").fill(PW);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Chemistry" })).toBeVisible();
    await expect(page.getByLabel(/planned, not ready yet/).first()).toBeVisible();
    for (const path of ["/discover", "/discover/chemistry", "/discover/space/moon-phases", "/discover/journey/build-a-robot"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), path).toBe(0);
    }
  });
});
