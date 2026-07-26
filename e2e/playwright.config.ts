import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/*
 * The app under test is the MiniTrack frontend, a sibling of this folder. The
 * API key lives in backend/.env as MINITRACK_API_KEYS (a comma-separated list) —
 * read the first one here so the suite needs no hardcoded secret and works
 * straight after `cp .env.example .env` in backend/.
 *
 * An explicit MINITRACK_API_KEY in the environment always wins, and a missing
 * .env is not an error: outside the MiniTrack repo you export the variable
 * yourself, and seed.spec.ts is where its absence gets reported.
 */
function apiKeyFromRepoEnv(): string | undefined {
  const prefix = 'MINITRACK_API_KEYS=';
  try {
    // __dirname, not import.meta: package.json has no "type": "module", so
    // Playwright transpiles this config to CommonJS.
    const line = readFileSync(resolve(__dirname, '../backend/.env'), 'utf8')
      .split('\n')
      .find((candidate) => candidate.startsWith(prefix));
    return line?.slice(prefix.length).split(',')[0].trim() || undefined;
  } catch {
    return undefined;
  }
}

process.env.MINITRACK_API_KEY ??= apiKeyFromRepoEnv();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // The MiniTrack frontend's Vite dev server. The agents navigate relative to it.
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',

    // Traces are what the Healer reads when debugging failures.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',

    // Recorded on every run, pass or fail, so a green run is reviewable too —
    // useful when you want to watch what the Generator actually produced rather
    // than read it. Costs a .webm per test in test-results/; delete the
    // directory when it gets big, or drop back to 'retain-on-failure'.
    video: 'on',
  },

  projects: [
    // Start with one browser. Add firefox/webkit once the suite is stable —
    // three browsers on flaky tests just triples your debugging.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari'] } },
  ],

  /*
   * Both halves of MiniTrack, because a run against a half-booted app fails in
   * ways indistinguishable from a real bug — and the Healer will happily "fix"
   * the test rather than notice the missing server.
   *
   * Ports are pinned: the backend's MINITRACK_CORS_ORIGINS only allows :5173,
   * so a Vite fallback to :5174 turns every request into a CORS failure.
   */
  webServer: [
    {
      command: '.venv/bin/uvicorn app.main:app --env-file .env --port 8000',
      cwd: '../backend',
      url: 'http://127.0.0.1:8000/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      cwd: '../frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
