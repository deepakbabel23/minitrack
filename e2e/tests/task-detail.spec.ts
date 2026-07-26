// spec: specs/task-detail.md
// seed: tests/seed.spec.ts

import { test, expect } from './fixtures';

/*
 * Status and priority badges are plain spans carrying an aria-hidden icon
 * alongside their text, so their text content is "○Active" rather than
 * "Active" and no exact text match can reach them. They have no role to target
 * either. The design-system class is the stable handle — DESIGN.md ▸ Badges
 * defines these, and the text is still asserted through it.
 *
 * Always scoped to the task panel: the header's "Connected" chip reuses
 * .badge--status-completed, so an unscoped match hits two elements.
 */
const ACTIVE_BADGE = '.badge--status-active';
const COMPLETED_BADGE = '.badge--status-completed';

test.describe('Task detail', () => {
  test('Shows the task title, description, priority and status', async ({ page, api }) => {
    // 1. Create an active task with a description and priority high.
    const task = await api.create({
      title: 'Review the deployment runbook',
      description: 'Check the rollback steps still match production.',
      priority: 'high',
    });

    // 2. Navigate to /tasks/{id}.
    await page.goto(`/tasks/${task.id}`);

    await expect(page.getByRole('heading', { name: task.title })).toBeVisible();
    await expect(page.getByText('Check the rollback steps still match production.')).toBeVisible();
    await expect(page.getByText('High priority')).toBeVisible();
    await expect(page.getByRole('article').locator(ACTIVE_BADGE)).toHaveText(/Active/);
    await expect(page.getByText(`Task #${task.id}`)).toBeVisible();

    await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Complete' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('Shows a placeholder when the task has no description', async ({ page, api }) => {
    // 1. Create a task with description: null.
    const task = await api.create({ title: 'Task with no description', description: null });

    // 2. Navigate to /tasks/{id}.
    await page.goto(`/tasks/${task.id}`);

    await expect(page.getByText('No description.')).toBeVisible();
  });

  test('Completing an active task', async ({ page, api }) => {
    // 1. Create an active task.
    const task = await api.create({ title: 'Rotate the staging API key' });

    // 2. Navigate to /tasks/{id} and click Complete.
    await page.goto(`/tasks/${task.id}`);
    await expect(page.getByRole('article').locator(ACTIVE_BADGE)).toHaveText(/Active/);
    await page.getByRole('button', { name: 'Complete' }).click();

    // The confirmation is transient — useFlash clears it after 5s.
    await expect(page.getByText('Task marked complete.')).toBeVisible();
    await expect(page.getByRole('article').locator(COMPLETED_BADGE)).toHaveText(/Completed/);

    // No Reopen exists: PATCH cannot touch `completed` and there is no
    // un-complete endpoint, so the button must be gone rather than disabled.
    await expect(page.getByRole('button', { name: 'Complete' })).toHaveCount(0);

    expect((await api.read(task.id)).completed).toBe(true);
  });

  test('A completed task offers no Complete button', async ({ page, api }) => {
    // 1. Create a task and complete it through the API.
    const task = await api.create({ title: 'Already finished' });
    await api.complete(task.id);

    // 2. Navigate to /tasks/{id}.
    await page.goto(`/tasks/${task.id}`);

    await expect(page.getByRole('article').locator(COMPLETED_BADGE)).toHaveText(/Completed/);
    await expect(page.getByRole('button', { name: 'Complete' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('Deleting a task after confirming', async ({ page, api }) => {
    // 1. Create a task.
    const task = await api.create({ title: 'Delete me once confirmed' });

    // 2. Navigate to /tasks/{id} and click Delete.
    await page.goto(`/tasks/${task.id}`);
    await page.getByRole('button', { name: 'Delete' }).click();

    // The dialog's confirm button is also named "Delete", so scope to the
    // dialog rather than matching the page-level button again.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Delete this task?')).toBeVisible();
    await expect(dialog.getByText(task.title)).toBeVisible();

    await dialog.getByRole('button', { name: 'Delete' }).click();

    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.getByText('Task deleted.')).toBeVisible();
    expect(await api.exists(task.id)).toBe(false);
  });

  test('Cancelling the delete dialog keeps the task', async ({ page, api }) => {
    // 1. Create a task.
    const task = await api.create({ title: 'Keep me after cancelling' });

    // 2. Navigate to /tasks/{id}, click Delete, then Cancel.
    await page.goto(`/tasks/${task.id}`);
    await page.getByRole('button', { name: 'Delete' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}$`));
    await expect(page.getByRole('heading', { name: task.title })).toBeVisible();
    expect(await api.exists(task.id)).toBe(true);
  });

  test('An unknown task id reports Task not found', async ({ page, api }) => {
    // 1. Create a task, note its id, delete it through the API.
    const task = await api.create({ title: 'Soon to be a stale link' });
    await api.remove(task.id);

    // 2. Navigate to /tasks/{id}.
    await page.goto(`/tasks/${task.id}`);

    await expect(page.getByRole('heading', { name: 'Task not found' })).toBeVisible();
    // exact, because the page also carries the "← Back to tasks" ghost link.
    await expect(page.getByRole('link', { name: 'Back to tasks', exact: true })).toBeVisible();
  });

  test('Back to tasks returns to the list', async ({ page, api }) => {
    // 1. Create a task and navigate to /tasks/{id}.
    const task = await api.create({ title: 'Navigate back from here' });
    await page.goto(`/tasks/${task.id}`);

    // 2. Click Back to tasks.
    await page.getByRole('link', { name: '← Back to tasks' }).click();

    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
  });
});
