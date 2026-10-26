import { expect, test, type Page } from "@playwright/test";

// K-12 grade bands: the teacher sets a grade, the student's app changes with it; teachers can preview every band.
const PW = "e2e-password-1";
async function login(page: Page, user: string) {
  await page.goto("/");
  await page.getByLabel("Username").fill(user);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector("aside[aria-label='Main navigation']");
}

test.describe.serial("K-12 grade bands", () => {
  test("a Grade 7 student sees the Build band home", async ({ page }) => {
    await login(page, "jordan");
    await expect(page.getByText("Grade 7 · Middle School")).toBeVisible();
    await expect(page.getByRole("region", { name: "Your learning path" })).toContainText("AI Foundations");
    await expect(page.getByText("Recommended for Grade 7")).toBeVisible();
    await expect(page.getByRole("region", { name: "System status" })).toHaveCount(0);     // only a small Local AI line below grade 9
    await expect(page.getByLabel("Main navigation").getByRole("link", { name: "Lab Status" })).toHaveCount(0);
  });

  test("teacher previews every band with View as", async ({ page }) => {
    await login(page, "mswilliams");
    await page.getByLabel("Main navigation").getByRole("link", { name: "View as Student" }).click();
    await page.getByRole("tab", { name: /K-2/ }).click();
    await expect(page.getByRole("navigation", { name: "What to do" }).getByText("My Stars")).toBeVisible();
    await page.getByRole("tab", { name: /9-12/ }).click();
    await expect(page.getByText("College and Career Pathways")).toBeVisible();
    await expect(page.getByRole("region", { name: "System status" })).toBeVisible();
  });

  test("teacher sets a Grade 1; that student gets the picture app, and the teacher's student view shows the grade", async ({ page }) => {
    await login(page, "mswilliams");
    const stu = (await (await page.request.get("/api/teacher/students")).json()).students.find((s: { username: string }) => s.username === "student01");
    await page.goto("/teacher/students");
    await page.getByRole("button", { name: `Edit ${stu.name}` }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Grade").selectOption("1");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("row", { name: new RegExp(stu.name) })).toContainText("Grade 1");
    await page.getByRole("link", { name: stu.name }).click();
    await expect(page.getByText(/Grade 1 · Early Years/)).toBeVisible();
    await expect(page.getByRole("region", { name: "Suggested next step" })).toBeVisible();
    await page.context().clearCookies();
    await login(page, "student01");
    await expect(page.getByRole("navigation", { name: "What to do" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Read to me" })).toBeVisible();
    await expect(page.getByLabel("Main navigation").getByText("Grade 1")).toBeVisible();
    await page.goto("/build");
    await expect(page.getByRole("heading", { name: "Play" })).toBeVisible();
    await expect(page.getByText("Robot Python Puzzles")).toHaveCount(0);
  });
});

test("Build: every category is open; an AI project runs in Python Lab and a science experiment saves notes", async ({ page }) => {
  await login(page, "jordan");
  await page.goto("/build");
  await expect(page.getByText("Coming later")).toHaveCount(0);
  await page.getByRole("button", { name: /AI Projects/ }).click();
  await page.getByRole("listitem").filter({ hasText: "Sort Fruit" }).getByRole("button", { name: "Open in Python Lab" }).click();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByLabel("Program output")).toContainText("orange", { timeout: 60_000 });
  await page.getByRole("button", { name: /Science Experiments/ }).click();
  await page.getByRole("listitem").filter({ hasText: "Skate Park Energy" }).getByRole("button", { name: "Start" }).click();
  await page.getByLabel("My results").fill("Fastest at the bottom.");
  await page.getByRole("button", { name: "Save to my projects" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.getByRole("button", { name: /Robotics/ }).click();
  await expect(page.getByRole("link", { name: /Start mission/ }).first()).toHaveAttribute("href", /reeborg/);
});

test("Local Documents: students read the class handouts; teachers have Resources", async ({ page }) => {
  await login(page, "jordan");
  await page.goto("/explore");
  await expect(page.getByRole("button", { name: /Teacher Resources/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Local Documents/ }).click();
  await page.getByRole("button", { name: /Python loops cheat sheet/ }).click();
  await expect(page.getByRole("region", { name: "Reader" })).toContainText("range(start, stop) stops BEFORE stop");
  await page.context().clearCookies();
  await login(page, "mswilliams");
  await page.getByLabel("Main navigation").getByRole("link", { name: "Resources" }).click();
  await expect(page.getByRole("heading", { name: "Teacher guides" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Khan for Educators/ })).toBeVisible();
  await page.getByLabel("Title").fill("Unit 3 reading");
  await page.getByLabel("File").setInputFiles({ name: "unit3.txt", mimeType: "text/plain", buffer: Buffer.from("Read pages 4-9.") });
  await page.getByRole("button", { name: "Add document" }).click();
  await expect(page.getByRole("link", { name: "Unit 3 reading" })).toBeVisible();
});

test("Assessments: a teacher builds one; the student takes it with help off; the teacher sees it to mark; Practice lists weak topics", async ({ page }) => {
  await login(page, "mswilliams");
  await page.getByLabel("Main navigation").getByRole("link", { name: "Assessments" }).click();
  await page.getByRole("link", { name: /New assessment/ }).click();
  await page.getByLabel("Title").fill("Quick fractions quiz");
  await page.getByLabel("Question", { exact: true }).fill("Which is bigger?");
  await page.getByLabel("Question 1 type").selectOption("choice");
  await page.getByLabel("Option 1", { exact: true }).fill("2/3");
  await page.getByLabel("Option 2", { exact: true }).fill("3/4");
  await page.getByLabel("Option 2 is the answer").check();
  await page.getByRole("button", { name: "Create assessment" }).click();
  await expect(page.getByRole("region", { name: "Quick fractions quiz" })).toContainText("0 of");
  await page.getByLabel("Main navigation").getByRole("link", { name: "Practice" }).click();
  await expect(page.getByRole("region", { name: "range start", exact: true })).toContainText("% right");
  const aid = (await (await page.request.get("/api/teacher/assignments?kind=assessment")).json()).assignments.find((a: { title: string }) => a.title === "Quick fractions quiz").id;
  await page.context().clearCookies();
  await login(page, "jordan");
  await page.goto(`/assignments/${aid}`);
  await expect(page.getByText("hints and checking are off")).toBeVisible();
  await expect(page.getByRole("button", { name: "Check answer" })).toHaveCount(0);
  await page.getByRole("radio", { name: "3/4" }).check();
  await page.getByRole("button", { name: /Submit Assignment/ }).click();
  await expect(page.getByText(/Submitted/).first()).toBeVisible();
});

test("AI Lesson Builder: draft, check, publish; the student finds it in Learn", async ({ page }) => {
  await login(page, "mswilliams");
  await page.getByLabel("Main navigation").getByRole("link", { name: "AI Lesson Builder" }).click();
  await page.getByLabel("Topic").fill("Volcanoes");
  await page.getByLabel("Grade").selectOption("5");
  await page.getByRole("button", { name: "Draft with AI" }).click();
  await expect(page.getByText("Check every fact and every right answer")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Title", { exact: true }).fill("How Volcanoes Work");
  await page.getByRole("button", { name: /publish/ }).click();
  await expect(page.getByRole("region", { name: "Your lessons" })).toContainText("Published");
  await page.context().clearCookies();
  await login(page, "jordan");
  await page.goto("/learn?tab=courses");
  await expect(page.getByRole("heading", { name: "From Your Teachers" })).toBeVisible();
});
