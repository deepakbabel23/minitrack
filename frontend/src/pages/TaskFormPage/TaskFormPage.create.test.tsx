import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ApiKeyProvider } from '../../auth/ApiKeyContext'
import { ApiClientError } from '../../api/client'
import TaskFormPage from './TaskFormPage'
import { createTask } from '../../api/tasks'

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
const createTaskMock = vi.mocked(createTask)

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/tasks/new']}>
      <ApiKeyProvider>
        <TaskFormPage mode="create" />
      </ApiKeyProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  createTaskMock.mockReset()
  navigateMock.mockReset()
  sessionStorage.clear()
})

describe('Create task form', () => {
  it('blocks a whitespace-only title without calling the API', async () => {
    const user = userEvent.setup()
    renderCreate()
    await user.type(screen.getByLabelText(/title/i), '   ')
    await user.click(screen.getByRole('button', { name: /save task/i }))
    expect(createTaskMock).not.toHaveBeenCalled()
    expect(screen.getByText(/title is required/i)).toBeInTheDocument()
  })

  it('submits a trimmed title and null description, then confirms', async () => {
    const user = userEvent.setup()
    createTaskMock.mockResolvedValue({
      id: 1,
      title: 'Buy milk',
      description: null,
      priority: 'medium',
      completed: false,
    })
    renderCreate()
    await user.type(screen.getByLabelText(/title/i), '  Buy milk  ')
    await user.click(screen.getByRole('button', { name: /save task/i }))
    await waitFor(() =>
      expect(createTaskMock).toHaveBeenCalledWith({
        title: 'Buy milk',
        description: null,
        priority: 'medium',
      }),
    )
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/tasks', { state: { flash: 'Task created.' } }),
    )
  })

  it('renders a 422 detail string from the server', async () => {
    const user = userEvent.setup()
    createTaskMock.mockRejectedValue(
      new ApiClientError(422, 'body.title: String should have at least 1 character', 'req-1'),
    )
    renderCreate()
    await user.type(screen.getByLabelText(/title/i), 'x')
    await user.click(screen.getByRole('button', { name: /save task/i }))
    expect(await screen.findByText(/should have at least 1 character/i)).toBeInTheDocument()
  })
})
