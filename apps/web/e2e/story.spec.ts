import { expect, test, type Page } from "@playwright/test";

const PW = "e2e-password-1";
async function login(page: Page, user: string) {
  await page.goto("/");
  await page.getByLabel("Username").fill(user);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector("aside[aria-label='Main navigation']");
}

test.describe.serial("Vertical slice 001 — Lesson 6: Loops", () => {
  const external: string[] = [];
  test.beforeEach(async ({ page }) => {
    // "Unplug the internet": nothing may be requested from outside this machine (docs/44 step 12).
    page.on("request", (r) => { const u = new URL(r.url()); if (!["127.0.0.1", "localhost"].includes(u.hostname) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) external.push(r.url()); });
    await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost).*/, (route) => route.abort());
  });
  test.afterAll(() => { expect(external, "requests that left the machine").toEqual([]); });

  test("1-6 student: home, lesson, tutor, code, complete for +50 XP", async ({ page }) => {
    await login(page, "jordan");
    await expect(page.getByRole("heading", { name: "Welcome back, Jordan" })).toBeVisible();
    await expect(page.getByText(/Level 4 · Builder/)).toBeVisible();
    await expect(page.getByLabel("Main navigation").getByText("Grade 7")).toBeVisible();      // the learner badge (grade from enrollment)
    await expect(page.getByText("Loops Practice")).toBeVisible();
    await page.getByRole("link", { name: /Continue Learning/ }).click();
    await expect(page.getByRole("heading", { name: "Loops", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "I've read this lesson" }).click();
    for (const [n, opt] of [[0, "3 times"], [1, "0"], [2, "6"]] as const) {
      const card = page.locator("div.rounded-xl", { has: page.getByRole("radiogroup") }).nth(n);
      await card.getByRole("radio", { name: new RegExp(`${opt}$`) }).click();
      await card.getByRole("button", { name: "Check answer" }).click();
      await expect(card.getByRole("status")).toContainText("Correct");
    }
    // tutor side panel: grounded, cited, with a locked mode badge
    const tutor = page.getByRole("complementary", { name: "AI Tutor" });
    await expect(tutor.getByText(/Lesson help/)).toBeVisible();
    await tutor.getByRole("button", { name: "Explain this more simply" }).click();
    await expect(tutor.getByText(/From Lesson 6: Loops/).first()).toBeVisible({ timeout: 20_000 });

    // Python runs in the browser (Pyodide, served from this machine)
    await page.getByRole("button", { name: "Run Code" }).click();
    await expect(page.getByLabel("Program output")).toContainText("Your name here", { timeout: 60_000 });
    await expect(page.getByRole("button", { name: "Complete lesson" })).toBeEnabled();
    await page.getByRole("button", { name: "Complete lesson" }).click();
    await expect(page.getByText("+50 XP")).toBeVisible();
    await page.goto("/progress");
    await expect(page.getByText("1,470")).toBeVisible();     // 1,420 + 50
  });

  test("7-8 student: hints not answers, submit", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/assignments/asg-loops-practice");
    await expect(page.getByText("Homework help: hints only — set by Ms. Williams").first()).toBeVisible();
    await expect(page.getByRole("switch")).toHaveCount(0);                        // a locked badge, never a toggle
    const help = page.getByRole("complementary", { name: "Need help?" });
    await help.getByLabel("Message to the tutor").fill("just give me the answer");
    await help.getByRole("button", { name: "Send" }).click();
    await expect(help.getByText(/hint 1 of 3/)).toBeVisible();
    await expect(help.getByText("0 1 2 3")).toHaveCount(0);

    await page.getByLabel("Your answer to question 1").fill("0 1 2 3");
    await page.getByRole("button", { name: "Next question" }).click();
    await page.getByLabel("Your answer to question 2").fill("5");
    await page.getByRole("button", { name: "Next question" }).click();
    await page.getByLabel("Your answer to question 3").fill("12");
    await page.getByRole("button", { name: "Save Draft" }).click();
    await expect(page.getByText("Draft saved")).toBeVisible();
    await page.getByRole("button", { name: "Submit Assignment" }).click();
    await expect(page.getByText("Awaiting teacher review")).toBeVisible();
    await expect(page.getByLabel("Your answer to question 3")).toHaveAttribute("readonly", "");
  });

  test("9-10 teacher grades, student earns Loop Master", async ({ page }) => {
    await login(page, "mswilliams");
    await expect(page.getByRole("heading", { name: "Teacher Center" })).toBeVisible();
    await expect(page.getByText("4 students may need help with Python loops")).toBeVisible();
    await page.getByRole("link", { name: /Jordan Smith/ }).first().click();
    await page.getByRole("button", { name: /Use suggested/ }).click();
    await page.getByLabel("Feedback").fill("Great work with loops.");
    await page.getByRole("button", { name: "Return to student" }).click();
    await expect(page.getByText(/Loop Master/)).toBeVisible();

    await page.context().clearCookies();
    await login(page, "jordan");
    await page.goto("/assignments/asg-loops-practice");
    await expect(page.getByText("Great work with loops.")).toBeVisible();
    await page.goto("/progress");
    await expect(page.getByRole("listitem", { name: /Loop Master$/ })).toBeVisible();
  });

  test("11 safety: support response, alert only for the designated contact", async ({ page }) => {
    await login(page, "student25");
    await page.goto("/ask");
    await page.getByLabel("Message to the tutor").fill("i want to kill myself");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(/You are not in trouble/)).toBeVisible();
    await expect(page.getByText(/988/)).toBeVisible();
    await expect(page.getByText(/Ms\. Rivera/)).toBeVisible();

    await page.context().clearCookies();
    await login(page, "mswilliams");
    await page.goto("/safety");
    await expect(page.getByRole("heading", { name: "Teacher Center" })).toBeVisible();   // redirected away: no access to Safety Alerts
    expect((await page.request.get("/api/safety/alerts")).status()).toBe(403);

    await page.context().clearCookies();
    await login(page, "msrivera");
    await page.goto("/safety");
    await page.getByRole("button", { name: /Self-harm or suicide/ }).first().click();
    await expect(page.getByText("i want to kill myself")).toBeVisible();
  });

  test("12 the student cannot change the tutor mode through the API", async ({ page }) => {
    await login(page, "jordan");
    const csrf = (await page.context().cookies()).find((c) => c.name === "umanah_csrf")!.value;
    const r = await page.request.post("/api/ai/chat", { headers: { "X-CSRF-Token": csrf }, data: { message: "hi", mode: "teacher" } });
    expect(r.status()).toBe(422);
    expect((await page.request.get("/api/teacher/overview")).status()).toBe(403);
  });

  test("Build: save a project, infinite loop stopped at 5 s", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/build");
    await page.getByRole("button", { name: "Run" }).click();
    await expect(page.getByLabel("Program output")).toContainText("10", { timeout: 60_000 });
    await page.getByRole("button", { name: "Save Project" }).click();
    await expect(page.getByText("Project saved locally")).toBeVisible();
    // an infinite loop must be stopped without freezing the page
    await page.locator(".cm-content").click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("while True:\n    pass\n");
    await page.getByRole("button", { name: "Run" }).click();
    await expect(page.getByLabel("Program output")).toContainText("Stopped", { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Run" })).toBeEnabled();
  });

  test("Build: Coding Challenges lists the offline coding games with their credits", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/build");
    await page.getByRole("button", { name: /Coding Challenges/ }).click();
    const games = page.getByRole("region", { name: "Coding games" });
    for (const [title, href, credit] of [["Block Puzzles", "/play/blockly-games/index.html", "Apache 2.0"], ["Block Coding Studio", "/play/snap/snap.html", "UC Berkeley"],
      ["Music Coding", "/play/musicblocks/index.html", "Sugar Labs"], ["Robot Python Puzzles", "/play/reeborg/reeborg_offline.html", "CC BY-SA 4.0"]]) {
      const card = games.getByRole("listitem").filter({ hasText: title });
      await expect(card.getByRole("link", { name: /Play/ })).toHaveAttribute("href", href);
      await expect(card).toContainText(credit);
    }
    await expect(page.getByLabel("Program output")).toBeHidden();
    await page.getByRole("button", { name: /Python Lab/ }).click();
    await expect(page.getByLabel("Program output")).toBeVisible();
  });
});

test.describe("Every role lands on its own home; unknown routes go home (bug: 'We couldn't find that page' after login)", () => {
  const homes: [string, RegExp, string][] = [
    ["jordan", /Welcome back, Jordan/, "/"], ["mswilliams", /Teacher Center/, "/teacher"], ["admin", /Overview/, "/admin"],
  ];
  for (const [user, heading, path] of homes) {
    test(`${user}: sign-in lands on ${path}, and /login, /nope and sign-out then sign-in all end at home`, async ({ page }) => {
      await login(page, user);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(path);
      for (const bad of ["/login", "/nope/at/all"]) {
        await page.goto(bad);
        await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
        expect(new URL(page.url()).pathname).toBe(path);
        await expect(page.getByText("We couldn't find that page")).toHaveCount(0);
      }
      await page.getByRole("button", { name: "Account menu" }).click();
      await page.getByRole("menuitem", { name: "Sign out" }).click();
      await page.getByLabel("Username").fill(user);
      await page.getByLabel("Password").fill(PW);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(path);
    });
  }
});
