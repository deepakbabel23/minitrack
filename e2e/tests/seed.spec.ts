import { test, expect } from '@playwright/test';

import { SESSION_STORAGE_KEY } from './fixtures';

/*
 * Environment bootstrap. Both `planner_setup_page` and `generator_setup_page`
 * boot from this file, so whatever state it leaves behind is the state the
 * agents explore from.
 *
 * MiniTrack has no accounts — /connect takes an API key instead. Leave this
 * blank and the Planner explores the connect screen and writes you a plan about
 * the connect screen.
 */

// One key, read by playwright.config.ts from backend/.env.
const API_KEY = process.env.MINITRACK_API_KEY;

// SESSION_STORAGE_KEY is imported from ./fixtures rather than re-declared —
// it mirrors frontend/src/auth/apiKeyStore.ts and one copy is enough.

test.describe('MiniTrack', () => {
  test('seed', async ({ page }) => {
    expect(
      API_KEY,
      'No MiniTrack API key. Set MINITRACK_API_KEYS in backend/.env ' +
        '(cp .env.example .env), or export MINITRACK_API_KEY yourself.',
    ).toBeTruthy();

    /*
     * Seed the key the way the app expects to find it rather than typing it
     * into the form: main.tsx calls hydrateFromSession() before React mounts,
     * so a key already in sessionStorage means the app boots connected.
     *
     * addInitScript, not a one-off evaluate — it re-runs before page scripts on
     * every navigation, so the agents stay connected as they explore. The key
     * never reaches the URL or the console; the app sends it as X-API-Key.
     */
    await page.addInitScript(
      ([storageKey, apiKey]) => {
        window.sessionStorage.setItem(storageKey, apiKey);
      },
      [SESSION_STORAGE_KEY, API_KEY!] as const,
    );

    await page.goto('/tasks');

    // Landing on /connect means the key was rejected or never took: fail here,
    // where the message is about auth, rather than 20 generated tests later.
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
  });
});
