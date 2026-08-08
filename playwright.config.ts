import { defineConfig, devices } from "@playwright/test";

/**
 * Visual capture and interaction checks for the workspace.
 *
 * GUI quality is a stated goal of this project, which means someone has to
 * actually look at the thing. This config exists so that "look at it" is a
 * command rather than a favour asked of whoever has a browser open.
 */
export default defineConfig({
  testDir: "./tests",
  outputDir: "./.playwright/results",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:1420",
    colorScheme: "dark",
    // Deterministic rendering: no caret blink, no animation mid-frame.
    launchOptions: { args: ["--force-color-profile=srgb", "--disable-lcd-text"] },
  },
  projects: [
    { name: "desk", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "laptop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:1420",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
