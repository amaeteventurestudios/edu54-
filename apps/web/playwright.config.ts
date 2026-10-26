import { defineConfig } from "@playwright/test";

// End-to-end story (docs/44): one real API on its own port and data dir, stub inference for determinism.
const PORT = 8102;
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  timeout: 120_000,
  workers: 1,
  reporter: [["list"]],
  use: { storageState: { cookies: [], origins: [`http://127.0.0.1:${PORT}`, `http://127.0.0.1:${PORT + 2}`].map((origin) => ({ origin, localStorage: [{ name: "umanah.tour.off", value: "1" }] })) }, baseURL: `http://127.0.0.1:${PORT}`, viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {} },
  webServer: [
    {
      command: `rm -rf /tmp/umanah-e2e && mkdir -p /tmp/umanah-e2e && cd ../../services/api && UMANAH_DATA_DIR=/tmp/umanah-e2e UMANAH_INFERENCE_BACKEND=stub UMANAH_DEMO_PASSWORD=e2e-password-1 uv run uvicorn umanah_api.main:app --port ${PORT}`,
      url: `http://127.0.0.1:${PORT}/api/health`, reuseExistingServer: false, timeout: 60_000,
      env: { PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` },
    },
    {   // the public try-it demo (docs/46): its own data dir and port, demo mode on
      command: `rm -rf /tmp/umanah-e2e-demo && mkdir -p /tmp/umanah-e2e-demo && cd ../../services/api && UMANAH_DATA_DIR=/tmp/umanah-e2e-demo UMANAH_DEMO_MODE=1 UMANAH_DEMO_SEED=0 UMANAH_INFERENCE_BACKEND=stub uv run uvicorn umanah_api.main:app --port ${PORT + 2}`,
      url: `http://127.0.0.1:${PORT + 2}/api/health`, reuseExistingServer: false, timeout: 90_000,
      env: { PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` },
    },
  ],
});
