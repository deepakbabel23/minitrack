import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ApiKeyProvider } from '../../auth/ApiKeyContext'
import TaskListPage from './TaskListPage'
import { listTasks, completeTask, deleteTask } from '../../api/tasks'
import type { Task } from '../../types'

vi.mock('../../api/tasks', () => ({
  listTasks: vi.fn(),
  completeTask: vi.fn(),
  deleteTask: vi.fn(),
}))
const listTasksMock = vi.mocked(listTasks)
const completeTaskMock = vi.mocked(completeTask)
const deleteTaskMock = vi.mocked(deleteTask)

function renderList(entry = '/tasks') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ApiKeyProvider>
        <TaskListPage />
      </ApiKeyProvider>
    </MemoryRouter>,
  )
}

const sample: Task[] = [
  { id: 1, title: 'Alpha', description: null, priority: 'high', completed: false },
  { id: 2, title: 'Beta', description: 'b', priority: 'low', completed: true },
]

beforeEach(() => {
  listTasksMock.mockReset()
  completeTaskMock.mockReset()
  deleteTaskMock.mockReset()
  sessionStorage.clear()
})

describe('TaskListPage', () => {
  it('renders tasks and hides "Load more" on a short page', async () => {
    listTasksMock.mockResolvedValue(sample)
    renderList()
    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('shows an empty state tailored to the active filter', async () => {
    listTasksMock.mockResolvedValue([])
    renderList('/tasks?status=active')
    expect(await screen.findByText(/no active tasks/i)).toBeInTheDocument()
  })

  it('requests only active tasks when the filter is active', async () => {
    listTasksMock.mockResolvedValue([])
    renderList('/tasks?status=active')
    await screen.findByText(/no active tasks/i)
    expect(listTasksMock).toHaveBeenCalledWith(
      expect.objectContaining({ completed: false }),
    )
  })

  it('completes an active task and announces it', async () => {
    const user = userEvent.setup()
    listTasksMock.mockResolvedValue([
      { id: 1, title: 'Alpha', description: null, priority: 'high', completed: false },
    ])
    completeTaskMock.mockResolvedValue({
      id: 1,
      title: 'Alpha',
      description: null,
      priority: 'high',
      completed: true,
    })
    renderList()
    await screen.findByText('Alpha')
    await user.click(screen.getByRole('button', { name: /^complete$/i }))

    await waitFor(() => expect(completeTaskMock).toHaveBeenCalledWith(1))
    // The Complete button is gone and the result is announced via role="status".
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /^complete$/i })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('status')).toHaveTextContent(/marked complete/i)
  })

  it('deletes a task only after confirming in the dialog', async () => {
    const user = userEvent.setup()
    listTasksMock.mockResolvedValue([
      { id: 1, title: 'Alpha', description: null, priority: 'low', completed: false },
    ])
    deleteTaskMock.mockResolvedValue(undefined)
    renderList()
    await screen.findByText('Alpha')

    // Opening the dialog must NOT delete anything yet.
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(deleteTaskMock).not.toHaveBeenCalled()

    // Confirm inside the dialog.
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(deleteTaskMock).toHaveBeenCalledWith(1))
    await waitFor(() => expect(screen.queryByText('Alpha')).not.toBeInTheDocument())
  })
})
