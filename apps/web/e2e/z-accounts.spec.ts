// Runs last: it changes people and classes, which the earlier story tests count.
import { expect, test, type Page } from "@playwright/test";

const PW = "e2e-password-1";
async function login(page: Page, user: string, pw = PW) {
  await page.goto("/");
  await page.getByLabel("Username").fill(user);
  await page.getByLabel("Password").fill(pw);
  await page.getByRole("button", { name: "Sign in" }).click();
}
async function logout(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.getByLabel("Username").waitFor();
}
const side = (page: Page) => page.getByRole("complementary", { name: "Main navigation" });

test.describe.serial("Accounts: roles, admin area, teacher class tools", () => {
  let teacherUser = "", teacherPw = "", studentUser = "", studentCard = "";

  test("owner adds a teacher; the new teacher must choose a password before anything else", async ({ page }) => {
    await login(page, "admin");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    for (const n of ["People", "Classes", "Safety Contacts", "School Settings", "Services", "Backups & Export", "Audit Log"]) await expect(side(page).getByRole("link", { name: n })).toBeVisible();
    await side(page).getByRole("link", { name: "People" }).click();
    await page.getByRole("button", { name: "Add person" }).click();
    await page.getByLabel("Full name").fill("Tia Newteacher");
    await page.getByLabel("Role", { exact: true }).selectOption("teacher");
    await page.getByRole("button", { name: "Add person" }).last().click();
    const card = page.getByRole("list", { name: "New logins" });
    await expect(card).toContainText("tia.newteacher");
    teacherUser = "tia.newteacher";
    teacherPw = (await card.locator("span.font-mono").nth(1).innerText()).trim();
    expect(teacherPw).toMatch(/^[a-z]+-[a-z]+-\d\d$/);
    await expect(page.getByRole("button", { name: "Print login cards" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Tia Newteacher")).toBeVisible();
    await logout(page);

    await login(page, teacherUser, teacherPw);
    await expect(page.getByRole("heading", { name: "Choose your password" })).toBeVisible();
    await page.getByLabel("Temporary password from your card").fill(teacherPw);
    await page.getByLabel("New password", { exact: true }).fill("my-new-password-9");
    await page.getByLabel("Type it again").fill("my-new-password-9");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByRole("heading", { name: "Teacher Center" })).toBeVisible();
    await logout(page);
  });

  test("owner gives that teacher a class; the teacher adds a student, imports a CSV and gets printable cards", async ({ page }) => {
    await login(page, "admin");
    await side(page).getByRole("link", { name: "Classes" }).click();
    await page.getByRole("button", { name: "New class" }).click();
    await page.getByLabel("Class name").fill("Period 6 Science");
    await page.getByLabel("Teacher").selectOption({ label: "Tia Newteacher" });
    await page.getByRole("button", { name: "Save class" }).click();
    await expect(page.getByRole("heading", { name: "Period 6 Science" })).toBeVisible();
    await logout(page);

    await login(page, teacherUser, "my-new-password-9");
    await side(page).getByRole("link", { name: "Classes" }).click();
    await expect(page.getByRole("tab", { name: /Period 6 Science/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Period 3/ })).toHaveCount(0);            // only their own classes
    await page.getByRole("button", { name: "Add student" }).click();
    await page.getByLabel("Full name").fill("Zara Zed");
    await page.getByRole("button", { name: "Add student" }).last().click();
    const list = page.getByRole("list", { name: "New logins" });
    await expect(list).toContainText("zara.zed");
    studentUser = "zara.zed";
    studentCard = (await list.locator("span.font-mono").nth(1).innerText()).trim();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Import CSV" }).click();
    await page.getByLabel("Student names").fill("name\nAmy Ash\nBen Birch\nCy Cedar");
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await expect(page.getByRole("list", { name: "New logins" }).getByRole("listitem")).toHaveCount(3);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("cell", { name: "Amy Ash", exact: true })).toBeVisible();
    // rename, reset to a PIN, remove from class
    await page.getByRole("button", { name: "Edit Amy Ash" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Amy Ash-Smith");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("cell", { name: "Amy Ash-Smith", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Reset password or PIN for Ben Birch/ }).click();
    await page.getByRole("button", { name: /4-digit PIN/ }).click();
    await expect(page.getByRole("list", { name: "New logins" })).toContainText("PIN");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Remove Cy Cedar from the class" }).click();
    await page.getByRole("button", { name: "Remove from class" }).click();
    await expect(page.getByRole("cell", { name: "Cy Cedar", exact: true })).toHaveCount(0);
    await logout(page);
  });

  test("the new student signs in, chooses a password, and lands on Home", async ({ page }) => {
    await login(page, studentUser, studentCard);
    await page.getByLabel("Temporary password from your card").fill(studentCard);
    await page.getByLabel("New password", { exact: true }).fill("student-pass-42");
    await page.getByLabel("Type it again").fill("student-pass-42");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByRole("heading", { name: /Welcome back, Zara/ })).toBeVisible();
  });

  test("deactivating a person signs them out; a sub-admin sees only what they were given", async ({ page }) => {
    await login(page, "admin");
    await side(page).getByRole("link", { name: "People" }).click();
    await page.getByLabel("Search people").fill("zara");
    await page.getByRole("button", { name: "Deactivate Zara Zed" }).click();
    await page.getByRole("button", { name: "Deactivate", exact: true }).click();
    await page.getByLabel("Show deactivated").check();
    await expect(page.getByText("Deactivated").first()).toBeVisible();
    // a sub-admin who may only manage classes
    await page.getByLabel("Search people").fill("");
    await page.getByRole("button", { name: "Add person" }).click();
    await page.getByLabel("Full name").fill("Sam Subadmin");
    await page.getByLabel("Role", { exact: true }).selectOption("sub_admin");
    await page.getByLabel("Add, edit, deactivate people and reset passwords").uncheck();
    await page.getByLabel("Create and edit classes and rosters").check();
    await page.getByRole("button", { name: "Add person" }).last().click();
    const li = page.getByRole("list", { name: "New logins" });
    const subPw = (await li.locator("span.font-mono").nth(1).innerText()).trim();
    await page.keyboard.press("Escape");
    await logout(page);
    await login(page, studentUser, "student-pass-42");
    await expect(page.getByText("That username or password isn't right.")).toBeVisible();      // deactivated
    await login(page, "sam.subadmin", subPw);
    await page.getByLabel("Temporary password from your card").fill(subPw);
    await page.getByLabel("New password", { exact: true }).fill("sub-admin-pass-1");
    await page.getByLabel("Type it again").fill("sub-admin-pass-1");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(side(page).getByRole("link", { name: "Classes" })).toBeVisible();
    for (const n of ["People", "Audit Log", "Backups & Export", "Services", "School Settings"]) await expect(side(page).getByRole("link", { name: n })).toHaveCount(0);
    await page.goto("/admin/audit");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();            // no permission: sent home, not a dead end
  });

  test("grading tells the student: the story test graded Jordan's Loops Practice, so the bell shows it", async ({ page }) => {
    await login(page, "jordan");
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.getByText("Loops Practice was graded")).toBeVisible();
    await page.getByRole("menuitem", { name: /Loops Practice was graded/ }).click();
    await expect(page).toHaveURL(/assignments\/asg-loops-practice/);
    await logout(page);
    await login(page, "mswilliams");
    await expect(page.getByText("Flagged tutor answers")).toBeVisible();
  });
});
