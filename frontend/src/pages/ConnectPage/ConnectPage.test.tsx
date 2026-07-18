import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ApiKeyProvider } from '../../auth/ApiKeyContext'
import { ApiClientError } from '../../api/client'
import ConnectPage from './ConnectPage'
import { verifyKey } from '../../api/tasks'

vi.mock('../../api/tasks', () => ({ verifyKey: vi.fn() }))
const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

const verifyKeyMock = vi.mocked(verifyKey)

function renderConnect() {
  return render(
    <MemoryRouter>
      <ApiKeyProvider>
        <ConnectPage />
      </ApiKeyProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  verifyKeyMock.mockReset()
  navigateMock.mockReset()
  sessionStorage.clear()
})

describe('ConnectPage', () => {
  it('blocks a blank submit without calling the API', async () => {
    const user = userEvent.setup()
    renderConnect()
    await user.click(screen.getByRole('button', { name: /connect to minitrack/i }))
    expect(verifyKeyMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your api key/i)
  })

  it('shows a clear message when the key is rejected (401)', async () => {
    const user = userEvent.setup()
    verifyKeyMock.mockRejectedValue(new ApiClientError(401, 'Invalid or missing API key'))
    renderConnect()
    await user.type(screen.getByLabelText(/api key/i), 'bad-key')
    await user.click(screen.getByRole('button', { name: /connect to minitrack/i }))
    expect(await screen.findByText(/that api key was rejected/i)).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('validates against GET /tasks (trimmed) and navigates on success', async () => {
    const user = userEvent.setup()
    verifyKeyMock.mockResolvedValue(undefined)
    renderConnect()
    await user.type(screen.getByLabelText(/api key/i), '  good-key  ')
    await user.click(screen.getByRole('button', { name: /connect to minitrack/i }))
    await waitFor(() => expect(verifyKeyMock).toHaveBeenCalledWith('good-key'))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/tasks', { replace: true }))
  })

  it('toggles key visibility with show/hide', async () => {
    const user = userEvent.setup()
    renderConnect()
    const input = screen.getByLabelText(/api key/i) as HTMLInputElement
    expect(input.type).toBe('password')
    await user.click(screen.getByRole('button', { name: /show/i }))
    expect(input.type).toBe('text')
  })
})
