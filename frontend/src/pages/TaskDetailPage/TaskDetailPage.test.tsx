import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ApiKeyProvider } from '../../auth/ApiKeyContext'
import { ApiClientError } from '../../api/client'
import TaskDetailPage from './TaskDetailPage'
import { getTask } from '../../api/tasks'

vi.mock('../../api/tasks', () => ({
  getTask: vi.fn(),
  completeTask: vi.fn(),
  deleteTask: vi.fn(),
}))
const getTaskMock = vi.mocked(getTask)

function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/tasks/${id}`]}>
      <ApiKeyProvider>
        <Routes>
          <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        </Routes>
      </ApiKeyProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  getTaskMock.mockReset()
  sessionStorage.clear()
})

describe('TaskDetailPage', () => {
  it('shows a completed task with no Complete and no Reopen action', async () => {
    getTaskMock.mockResolvedValue({
      id: 1,
      title: 'Alpha',
      description: 'A',
      priority: 'high',
      completed: true,
    })
    renderDetail('1')
    expect(await screen.findByRole('heading', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reopen/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^complete$/i })).not.toBeInTheDocument()
  })

  it('renders a "Task not found" panel on 404', async () => {
    getTaskMock.mockRejectedValue(new ApiClientError(404, 'Task not found', 'r1'))
    renderDetail('999')
    expect(await screen.findByText(/task not found/i)).toBeInTheDocument()
  })
})
