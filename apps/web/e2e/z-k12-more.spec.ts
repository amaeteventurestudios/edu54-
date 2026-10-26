import { expect, test, type Page } from "@playwright/test";

// K-12 spec leftovers: school entry on sign-in, School -> Grade -> Class -> Student, widening a student's content,
// handing a project in, and Practice for the student's grade.
const PW = "e2e-password-1";
async function login(page: Page, user: string, staff = false) {
  await page.goto("/");
  if (staff) await page.getByRole("radio", { name: "Teacher or staff" }).click();
  await page.getByLabel("Username").fill(user);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector("aside[aria-label='Main navigation']", { state: "attached" });
}

test.describe.serial("K-12 spec leftovers", () => {
  test("sign-in shows the school and a student or staff entry", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("School entry")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByLabel("Password or PIN")).toBeVisible();
    await page.getByRole("radio", { name: "Teacher or staff" }).click();
    await expect(page.getByRole("heading", { name: "Staff sign-in" })).toBeVisible();
    await expect(page.getByLabel("Password or PIN")).toHaveCount(0);
    await login(page, "mswilliams", true);
    await expect(page.getByRole("heading", { name: /Teacher Center/ })).toBeVisible();
  });

  test("teacher walks School -> Grade -> Class -> Student and widens a student's content", async ({ page }) => {
    await login(page, "mswilliams", true);
    await page.getByLabel("Main navigation").getByRole("link", { name: "School by Grade" }).click();
    await expect(page.getByText("Grade 7").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Period 3/ }).first()).toBeVisible();
    const stu = (await (await page.request.get("/api/teacher/students")).json()).students.find((s: { username: string }) => s.username === "student03");
    await page.getByRole("link", { name: stu.name }).first().click();
    const content = page.getByRole("region", { name: "Content" });
    await expect(content).toContainText("6-8 · Build");
    await content.getByLabel(/9-12 · Launch/).check();
    await content.getByRole("button", { name: "Save" }).click();
    await expect(content.getByRole("status")).toHaveText("Saved");
    await page.context().clearCookies();
    await login(page, "student03");
    const me = await (await page.request.get("/api/auth/me")).json();
    expect(me.user.content_bands).toEqual(["build", "launch"]);
    expect(me.user.band).toBe("build");
  });

  test("a student hands in a science experiment and the teacher reads it", async ({ page }) => {
    await login(page, "student02");
    await page.goto("/build");
    await page.getByRole("button", { name: /Science Experiments/ }).click();
    await page.getByRole("button", { name: "Start" }).first().click();
    const ws = page.getByRole("region", { name: "Project workspace" });
    await expect(ws.getByRole("button", { name: "Hand in to my teacher" })).toBeDisabled();
    await ws.getByLabel("My results").fill("The longer the string, the slower it swings.");
    await ws.getByRole("button", { name: "Save to my projects" }).click();
    await ws.getByRole("button", { name: "Hand in to my teacher" }).click();
    await expect(ws.getByText("Handed in. Your teacher can read it now.")).toBeVisible();
    await expect(ws.getByRole("complementary", { name: "Project helper" })).toBeVisible();
    await page.context().clearCookies();
    await login(page, "mswilliams", true);
    const stu = (await (await page.request.get("/api/teacher/students")).json()).students.find((s: { username: string }) => s.username === "student02");
    await page.goto(`/teacher/students/${stu.id}`);
    const projects = page.getByRole("region", { name: "Projects" });
    await expect(projects).toContainText("Handed in");
    await expect(projects).toContainText("The longer the string, the slower it swings.");
  });

  test("Practice starts with the student's grade, then coding practice", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/learn?tab=practice");
    await expect(page.getByRole("heading", { name: "Practice for Grade 7" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Coding practice" })).toBeVisible();
  });

  test("phone width: new screens have no sideways scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await login(page, "mswilliams", true);
    for (const path of ["/teacher/school", "/teacher/students"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBe(true);
    }
  });
});
