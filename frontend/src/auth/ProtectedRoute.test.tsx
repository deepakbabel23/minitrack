import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ApiKeyProvider } from './ApiKeyContext'
import ProtectedRoute from './ProtectedRoute'

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ApiKeyProvider>
        <Routes>
          <Route path="/connect" element={<div>connect screen</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/tasks" element={<div>tasks screen</div>} />
          </Route>
        </Routes>
      </ApiKeyProvider>
    </MemoryRouter>,
  )
}

afterEach(() => sessionStorage.clear())

describe('ProtectedRoute', () => {
  it('redirects to /connect when no key is stored', () => {
    sessionStorage.clear()
    renderAt('/tasks')
    expect(screen.getByText('connect screen')).toBeInTheDocument()
    expect(screen.queryByText('tasks screen')).not.toBeInTheDocument()
  })

  it('renders the protected screen when a key is remembered', () => {
    sessionStorage.setItem('minitrack_api_key', 'k-123')
    renderAt('/tasks')
    expect(screen.getByText('tasks screen')).toBeInTheDocument()
  })
})
