import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ApiKeyProvider } from '../../auth/ApiKeyContext'
import TaskFormPage from './TaskFormPage'
import { getTask, replaceTask } from '../../api/tasks'

vi.mock('../../api/tasks', () => ({
  createTask: vi.fn(),
  getTask: vi.fn(),
  replaceTask: vi.fn(),
}))
const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})
const getTaskMock = vi.mocked(getTask)
const replaceTaskMock = vi.mocked(replaceTask)

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={['/tasks/5/edit']}>
      <ApiKeyProvider>
        <Routes>
          <Route path="/tasks/:taskId/edit" element={<TaskFormPage mode="edit" />} />
        </Routes>
      </ApiKeyProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  getTaskMock.mockReset()
  replaceTaskMock.mockReset()
  navigateMock.mockReset()
  sessionStorage.clear()
})

describe('Edit task form (full replacement)', () => {
  it('pre-fills the loaded task and PATCHes the WHOLE object', async () => {
    const user = userEvent.setup()
    getTaskMock.mockResolvedValue({
      id: 5,
      title: 'Original',
      description: 'keep me',
      priority: 'high',
      completed: false,
    })
    replaceTaskMock.mockResolvedValue({
      id: 5,
      title: 'Renamed',
      description: 'keep me',
      priority: 'high',
      completed: false,
    })
    renderEdit()

    const titleInput = (await screen.findByLabelText(/title/i)) as HTMLInputElement
    expect(titleInput.value).toBe('Original')

    await user.clear(titleInput)
    await user.type(titleInput, 'Renamed')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    // The unchanged description and priority are sent too — proving the form
    // submits a full TaskInput, not just the changed field.
    await waitFor(() =>
      expect(replaceTaskMock).toHaveBeenCalledWith(5, {
        title: 'Renamed',
        description: 'keep me',
        priority: 'high',
      }),
    )
  })
})
