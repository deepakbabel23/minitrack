// spec: specs/task-edit.md
// seed: tests/seed.spec.ts

import { test, expect } from './fixtures';

test.describe('Edit task', () => {
  test('Pre-fills the form with the current values', async ({ page, api }) => {
    // 1. Create a task with a known title, description and priority low.
    const task = await api.create({
      title: 'Draft the release notes',
      description: 'Cover the auth changes.',
      priority: 'low',
    });

    // 2. Navigate to /tasks/{id}/edit.
    await page.goto(`/tasks/${task.id}/edit`);

    await expect(page.getByRole('heading', { name: 'Edit task' })).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveValue('Draft the release notes');
    await expect(page.getByLabel('Description')).toHaveValue('Cover the auth changes.');
    await expect(page.getByLabel('Priority')).toHaveValue('low');
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('Saving changes returns to the detail page', async ({ page, api }) => {
    // 1. Create a task.
    const task = await api.create({
      title: 'Original title',
      description: 'Original description.',
      priority: 'low',
    });

    // 2. Change the title, description and priority.
    await page.goto(`/tasks/${task.id}/edit`);
    await page.getByLabel('Title').fill('Updated title');
    await page.getByLabel('Description').fill('Updated description.');
    await page.getByLabel('Priority').selectOption('high');

    // 3. Click Save changes.
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}$`));
    await expect(page.getByText('Task updated.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Updated title' })).toBeVisible();
    await expect(page.getByText('Updated description.')).toBeVisible();
    await expect(page.getByText('High priority')).toBeVisible();

    const saved = await api.read(task.id);
    expect(saved.title).toBe('Updated title');
    expect(saved.description).toBe('Updated description.');
    expect(saved.priority).toBe('high');
  });

  test('A blank title is rejected before any request is sent', async ({ page, api }) => {
    // 1. Create a task.
    const task = await api.create({ title: 'Title must survive' });

    // Fail loudly if the client-side gate ever stops catching this: a PATCH
    // reaching the network means the round trip the gate exists to avoid.
    let patched = false;
    page.on('request', (request) => {
      if (request.method() === 'PATCH') patched = true;
    });

    // 2. Clear the Title field and submit.
    await page.goto(`/tasks/${task.id}/edit`);
    await page.getByLabel('Title').fill('');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Title is required.')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}/edit$`));
    expect(patched).toBe(false);
    expect((await api.read(task.id)).title).toBe('Title must survive');
  });

  test('A whitespace-only title is rejected the same way', async ({ page, api }) => {
    // 1. Create a task.
    const task = await api.create({ title: 'Whitespace is not a title' });

    // 2. Replace the Title with spaces and submit.
    await page.goto(`/tasks/${task.id}/edit`);
    await page.getByLabel('Title').fill('   ');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Title is required.')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}/edit$`));
    expect((await api.read(task.id)).title).toBe('Whitespace is not a title');
  });

  test('Cancel abandons the edit', async ({ page, api }) => {
    // 1. Create a task.
    const task = await api.create({ title: 'Unchanged by Cancel' });

    // 2. Change the title, then click Cancel.
    await page.goto(`/tasks/${task.id}/edit`);
    await page.getByLabel('Title').fill('This should never be saved');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}$`));
    await expect(page.getByRole('heading', { name: 'Unchanged by Cancel' })).toBeVisible();
    expect((await api.read(task.id)).title).toBe('Unchanged by Cancel');
  });

  test('Clearing the description writes NULL, not an empty string', async ({ page, api }) => {
    // 1. Create a task with a description.
    const task = await api.create({
      title: 'Description gets cleared',
      description: 'This text is about to go away.',
    });

    // 2. Clear the Description field and save.
    await page.goto(`/tasks/${task.id}/edit`);
    await page.getByLabel('Description').fill('');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}$`));
    await expect(page.getByText('No description.')).toBeVisible();

    // toTaskInput() maps "" to null, so the column holds NULL rather than "".
    expect((await api.read(task.id)).description).toBeNull();
  });

  test('An unknown task id reports Task not found', async ({ page, api }) => {
    // 1. Create a task, note its id, delete it through the API.
    const task = await api.create({ title: 'Soon to be a stale edit link' });
    await api.remove(task.id);

    // 2. Navigate to /tasks/{id}/edit.
    await page.goto(`/tasks/${task.id}/edit`);

    await expect(page.getByRole('heading', { name: 'Task not found' })).toBeVisible();
    // exact, because the page also carries the "← Back to tasks" ghost link.
    await expect(page.getByRole('link', { name: 'Back to tasks', exact: true })).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveCount(0);
  });
});
