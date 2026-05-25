import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "fs";

// Load .env.local for local development (not needed in CI where env is injected)
const envLocal = ".env.local";
if (existsSync(envLocal)) {
  for (const line of readFileSync(envLocal, "utf-8").split("\n")) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (m) {
      const [, key, rawVal] = m;
      if (key && rawVal !== undefined && !(key in process.env)) {
        process.env[key] = rawVal.replace(/^(['"])(.*)\1$/, "$2");
      }
    }
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
