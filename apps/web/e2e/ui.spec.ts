import { expect, test, type Page } from "@playwright/test";

const PW = "e2e-password-1";
async function login(page: Page, user: string) {
  await page.goto("/");
  await page.getByLabel("Username").fill(user);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector("aside[aria-label='Main navigation']");
}
const side = (page: Page) => page.getByRole("complementary", { name: "Main navigation" });

test.describe.serial("Ask: chats live in the navy sidebar; answers are safe Markdown", () => {
  test("recent chats, search, Markdown, code with Try it in Build, KaTeX", async ({ page }) => {
    await login(page, "jordan");
    await page.getByRole("link", { name: "Ask" }).first().click();
    await expect(side(page).getByText("Recent chats")).toBeVisible();
    await expect(side(page).getByRole("button", { name: "New Conversation" })).toBeVisible();
    await expect(side(page).getByText("My courses")).toBeVisible();
    await expect(page.getByLabel("Conversations")).toHaveCount(0);          // no separate white panel any more

    await side(page).getByLabel("Search your chats").fill("loop does");
    await side(page).getByRole("link", { name: "What a for loop does" }).click();
    const chat = page.locator(".tutor-md").first();
    await expect(chat.locator("strong", { hasText: "loop" }).first()).toBeVisible();
    await expect(page.getByText("Try it in Build")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy code" })).toBeVisible();
    await expect(page.getByText("From From")).toHaveCount(0);

    await side(page).getByLabel("Search your chats").fill("Multiplying");
    await side(page).getByRole("link", { name: "Multiplying 12 by 3" }).click();
    await expect(page.locator(".katex").first()).toBeVisible();
    // no em dashes anywhere in the seeded answers
    expect((await page.locator(".tutor-md").allInnerTexts()).join(" ")).not.toMatch(/\u2014/);
  });

  test("Try it in Build opens the code in the editor", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/ask?c=1");
    await page.getByText("Try it in Build").click();
    await expect(page).toHaveURL(/\/build$/);
    await expect(page.locator(".cm-content")).toContainText("range(3)");
  });

  test("rename and delete a chat; assignment chats cannot be deleted", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/ask");
    await side(page).getByRole("button", { name: /Options for Fixing a NameError/ }).click({ force: true });
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByLabel("Chat name").fill("My NameError bug");
    await page.getByLabel("Chat name").press("Enter");
    await expect(side(page).getByRole("link", { name: "My NameError bug" })).toBeVisible();
    await side(page).getByRole("button", { name: /Options for My NameError bug/ }).click({ force: true });
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete chat" }).click();
    await expect(side(page).getByRole("link", { name: "My NameError bug" })).toHaveCount(0);
    await side(page).getByLabel("Search your chats").fill("Loops Practice");
    await side(page).getByRole("button", { name: /Options for Loops Practice hint/ }).click({ force: true });
    await expect(page.getByRole("menuitem", { name: /Stays with the assignment/ })).toHaveAttribute("aria-disabled", "true");
  });

  test("Enter sends, Shift+Enter adds a line, Stop ends the answer, thumbs down is remembered, follow-ups appear", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/ask");
    const box = page.getByLabel("Message to the tutor");
    await box.fill("first line");
    await box.press("Shift+Enter");
    await box.type("second line");
    expect(await box.inputValue()).toBe("first line\nsecond line");
    await box.fill("[slow] please explain what a variable is and why we use them in programs every day");
    await box.press("Enter");
    await expect(page.getByRole("button", { name: "Stop the answer" })).toBeVisible();
    await page.getByRole("button", { name: "Stop the answer" }).click();
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();          // back to normal, the page did not hang
    await box.fill("What is a variable?");
    await box.press("Enter");
    await expect(page.getByRole("group", { name: "Suggested follow-up questions" })).toBeVisible({ timeout: 20_000 });
    const down = page.getByRole("button", { name: /wrong or unhelpful/ }).last();
    await down.click();
    await expect(down).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("your teacher will take a look")).toBeVisible();
  });
});

test.describe("Practice (inside Learn)", () => {
  test("a sprint: five questions, explanations, score, XP", async ({ page }) => {
    await login(page, "jordan");
    await expect(side(page).getByRole("link", { name: "Revision" })).toHaveCount(0);      // Practice lives inside Learn now
    await side(page).getByRole("link", { name: "Learn" }).click();
    await page.getByRole("tab", { name: "Practice" }).click();
    await expect(page).toHaveURL(/tab=practice/);
    await expect(page.getByText("Python Loops").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Weak Topics" }).first()).toBeVisible();
    await page.getByRole("button", { name: /Start 10-Minute Revision Sprint/ }).click();
    for (let i = 1; i <= 5; i++) {
      await expect(page.getByText(`Question ${i} of 5`)).toBeVisible();
      await page.getByRole("radio").first().click();
      await expect(page.getByRole("status")).toBeVisible();
      await page.getByRole("button", { name: i === 5 ? "Finish sprint" : "Next question" }).click();
    }
    await expect(page.getByText("Revision Sprint Complete!")).toBeVisible();
    await expect(page.getByText(/\+\d+ XP/).first()).toBeVisible();
    await expect(page.getByText("Suggested next topic")).toBeVisible();
  });
  test("flashcards flip", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/revision");
    await page.getByRole("button", { name: /Flashcards/ }).first().click();
    await page.getByRole("button", { name: "Show the answer" }).click();
    await expect(page.getByText("Answer", { exact: true })).toBeVisible();
  });
});

test.describe("Build helper and errors", () => {
  test("helper buttons, error help, resizable panel", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/build");
    const helper = page.getByRole("complementary", { name: "AI Helper" });
    await expect(helper.getByText("Stuck? Ask for a hint or an explanation")).toBeVisible();
    for (const b of ["Explain my code", "Give me a hint", "Find my bug", "Give me a bigger challenge"]) await expect(helper.getByRole("button", { name: b })).toBeVisible();
    const w0 = (await helper.boundingBox())!.width;
    const total = (await page.locator("main").boundingBox())!.width;
    expect(w0 / total).toBeGreaterThan(0.33);
    await page.getByRole("separator", { name: /Resize/ }).focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
    expect((await helper.boundingBox())!.width).toBeGreaterThan(w0 + 20);
    await page.locator(".cm-content").click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("print(undefined_name)\n");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    const help = page.getByRole("button", { name: "Help me understand this error" });
    await expect(help).toBeVisible({ timeout: 60_000 });
    await help.click();
    await expect(helper.getByText(/error when I ran my code/)).toBeVisible();
    await expect(helper.locator(".tutor-md").last()).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Layout", () => {
  test("assignment tab bar is not cut off", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/assignments/asg-loops-practice");
    const list = page.getByRole("tablist");
    const lb = (await list.boundingBox())!;
    for (const name of ["Instructions", "Worksheet", "Resources", "Your Work"]) {
      const b = (await page.getByRole("tab", { name }).boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(40);
      expect(b.y).toBeGreaterThanOrEqual(lb.y - 1);
      expect(b.y + b.height).toBeLessThanOrEqual(lb.y + lb.height + 1);
    }
  });
  test("content is wide on a 1440 screen (no narrow centered column)", async ({ page }) => {
    await login(page, "jordan");
    for (const path of ["/learn", "/progress", "/learn?tab=practice"]) {
      await page.goto(path);
      const w = (await page.locator("main > div, main > section").first().boundingBox())!.width;
      expect(w).toBeGreaterThan(1050);
    }
  });
});

test.describe("Explore and Settings", () => {
  test("Explore says so plainly when the library is off, and never shows plan names", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/explore");
    await page.getByLabel("Search the library").fill("moon");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText(/encyclopedia isn't available right now/).first()).toBeVisible();
    await expect(page.getByText(/Phase \d/)).toHaveCount(0);
    await expect(page.getByText("Coming soon")).toHaveCount(0);                     // every Explore shelf is open now
  });
  test("School Library says so plainly when the content library is off", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/explore");
    await page.getByRole("button", { name: /School Library/ }).click();
    await expect(page.getByText(/School Library isn't available right now/)).toBeVisible();
  });
  test("Settings copy depends on the role", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/settings");
    await expect(page.getByText("Your school sets the tutor's rules")).toBeVisible();
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await page.getByLabel("Username").waitFor();
    await login(page, "mswilliams");
    await page.goto("/settings");
    await expect(page.getByText("Your school sets the tutor's rules")).toHaveCount(0);
    await expect(page.getByText(/You set the tutor's help level/)).toBeVisible();
  });
});

test.describe("First-sign-in tour", () => {
  test("shows once, can be skipped, and can be reopened", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("umanah.tour.off"));
    await login(page, "student03");
    const dlg = page.getByRole("dialog");
    await expect(dlg.getByText("Welcome, Noah")).toBeVisible();
    await dlg.getByRole("button", { name: "Next" }).click();
    await expect(dlg.getByText("Get help", { exact: false }).or(dlg.getByText("Courses, lessons"))).toBeVisible();
    await dlg.getByRole("button", { name: "Skip the tour" }).click();
    await expect(dlg).toHaveCount(0);
    await page.reload();
    await page.waitForSelector("aside[aria-label='Main navigation']");
    await expect(page.getByRole("dialog")).toHaveCount(0);                       // not shown a second time
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Take the tour" }).click();
    await expect(page.getByRole("dialog").getByText("Welcome, Noah")).toBeVisible();
  });
  test("page titles follow the screen", async ({ page }) => {
    await login(page, "jordan");
    await page.goto("/revision");                                  // old links still work: they open Practice in Learn
    await expect(page).toHaveURL(/\/learn\?tab=practice/);
    await page.goto("/progress");
    await expect(page).toHaveTitle("Progress · Umanah AI Lab");
    await page.goto("/learn");
    await expect(page).toHaveTitle("Learn · Umanah AI Lab");
  });
});
