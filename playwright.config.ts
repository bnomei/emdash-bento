import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    locale: "en-GB",
    timezoneId: "Europe/Dublin",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "light", use: { colorScheme: "light" } },
    { name: "dark", use: { colorScheme: "dark" } },
  ],
  webServer: {
    command: "npm run test:browser:serve",
    url: "http://127.0.0.1:4173/test/browser/",
    reuseExistingServer: !process.env.CI,
  },
});
