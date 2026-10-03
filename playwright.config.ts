import { defineConfig, devices } from "@playwright/test";

// QUA-04 : viewport mobile. Supabase local (pnpm db:start) et Mailpit sont requis.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Base locale et Mailpit partagés : un test à la fois.
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    ...devices["Pixel 7"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
  },
});
