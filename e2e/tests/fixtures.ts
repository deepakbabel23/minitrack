/**
 * Shared test setup: a page that boots already connected, and an API handle for
 * creating the task a test operates on.
 *
 * Why an API handle rather than driving the create form: these specs are about
 * the detail and edit screens. Building fixtures through the UI would make a
 * failure in the create form show up as ten unrelated failures over here.
 *
 * Every task created through `api` is deleted after the test, so the suite can
 * run `fullyParallel` against one SQLite file without tests colliding — and so
 * the demo database still holds only its four seeded tasks afterwards.
 */
import { test as base, expect, type Page } from '@playwright/test';

// Must match SESSION_STORAGE_KEY in frontend/src/auth/apiKeyStore.ts.
export const SESSION_STORAGE_KEY = 'minitrack_api_key';

// Resolved by playwright.config.ts from backend/.env.
export const API_KEY = process.env.MINITRACK_API_KEY;

// The backend, not the Vite dev server that `use.baseURL` points at.
const API_BASE_URL = process.env.MINITRACK_API_BASE_URL ?? 'http://127.0.0.1:8000';

export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: Priority;
  completed: boolean;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  priority?: Priority;
}

const MISSING_KEY =
  'No MiniTrack API key. Set MINITRACK_API_KEYS in backend/.env ' +
  '(cp .env.example .env), or export MINITRACK_API_KEY yourself.';

/**
 * Put the key where the app looks for it. `main.tsx` calls
 * hydrateFromSession() before React mounts, so a key already in sessionStorage
 * means the app boots straight to /tasks instead of bouncing to /connect.
 *
 * addInitScript, not a one-off evaluate: it re-runs before page scripts on
 * every navigation, so a test that reloads stays connected.
 */
export async function seedApiKey(page: Page): Promise<void> {
  expect(API_KEY, MISSING_KEY).toBeTruthy();
  await page.addInitScript(
    ([storageKey, apiKey]) => {
      window.sessionStorage.setItem(storageKey, apiKey);
    },
    [SESSION_STORAGE_KEY, API_KEY!] as const,
  );
}

export interface TaskApi {
  /** Creates a task and registers it for deletion when the test ends. */
  create(input: TaskInput): Promise<Task>;
  read(id: number): Promise<Task>;
  complete(id: number): Promise<Task>;
  /** 404 is success here — the point is that the task is gone. */
  remove(id: number): Promise<void>;
  exists(id: number): Promise<boolean>;
}

export const test = base.extend<{ api: TaskApi }>({
  page: async ({ page }, use) => {
    await seedApiKey(page);
    await use(page);
  },

  api: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { 'X-API-Key': API_KEY ?? '' },
    });
    const created = new Set<number>();

    const api: TaskApi = {
      async create(input) {
        const response = await context.post('/tasks', {
          data: {
            title: input.title,
            description: input.description ?? null,
            priority: input.priority ?? 'medium',
          },
        });
        expect(response.status(), await response.text()).toBe(201);
        const task = (await response.json()) as Task;
        created.add(task.id);
        return task;
      },

      async read(id) {
        const response = await context.get(`/tasks/${id}`);
        expect(response.ok(), await response.text()).toBeTruthy();
        return (await response.json()) as Task;
      },

      async complete(id) {
        const response = await context.post(`/tasks/${id}/complete`);
        expect(response.ok(), await response.text()).toBeTruthy();
        return (await response.json()) as Task;
      },

      async remove(id) {
        await context.delete(`/tasks/${id}`);
        created.delete(id);
      },

      async exists(id) {
        const response = await context.get(`/tasks/${id}`);
        return response.status() === 200;
      },
    };

    await use(api);

    // Teardown. A task the test already deleted is no longer in the set, and a
    // 404 on anything else would mean the test deleted it another way — either
    // is fine, so the status is not checked.
    for (const id of created) {
      await context.delete(`/tasks/${id}`);
    }
    await context.dispose();
  },
});

export { expect };
