import { defineConfig } from "@playwright/test";

// EDU54 instances as installed (docs/edu54/INSTALL-RUNBOOK.md Phase 7): the live K-12 and University demo instances.
//   EDU54_CREDENTIALS=<EDU54_ROOT>/secrets/demo-accounts.txt npx playwright test -c playwright.edu54.config.ts
export default defineConfig({
  testDir: "./e2e-edu54",
  timeout: 180_000,
  expect: { timeout: 20_000 },           // this demo box is shared with a live lab; pages can take several seconds under load
  workers: 1,
  reporter: [["list"]],
  use: { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {} },
});
