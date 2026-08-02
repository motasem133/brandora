import { defineConfig, devices } from '@playwright/test'

/**
 * Browser tests for the surfaces server-side assertions cannot reach.
 *
 * Every UI bug this project has shipped — a tab that rendered but could not be
 * selected, a chat erased by navigation, progress that vanished on a client
 * transition — passed the HTTP and database suite. Those failures only exist in
 * a browser, so this is where they get caught.
 */
export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false, // shared database, shared account
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  /*
   * Tests run against a production build on its own port.
   *
   * The dev server rebuilds constantly and can serve chunks a freshly opened
   * browser cannot instantiate, which surfaces as a hydration failure that has
   * nothing to do with the application. A production build is also what
   * customers actually get.
   */
  webServer: {
    command: 'pnpm build && pnpm start --port 3100',
    url: 'http://localhost:3100/en',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
    /*
     * The app's own origin must match the port the tests hit.
     *
     * NEXT_PUBLIC_APP_URL is inlined at build time and is what the auth client
     * calls; Better Auth then rejects a request whose Origin does not match its
     * baseURL. Left at the dev port, every sign-in from the test server is a
     * cross-origin request that is refused.
     */
    env: {
      NEXT_PUBLIC_APP_URL: 'http://localhost:3100',
      BETTER_AUTH_URL: 'http://localhost:3100',
    },
  },

  use: {
    baseURL: process.env.TEST_BASE_URL ?? 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
})
