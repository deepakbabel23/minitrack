import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { request, ApiClientError, setApiKey, setUnauthorizedHandler } from './client'

// Unit tests for the API client with `fetch` mocked — no backend needed. These
// pin the contract corrections that the original plan got wrong.

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  setApiKey(null)
  setUnauthorizedHandler(null)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

function fakeResponse(status: number, body: string | null): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => body ?? '',
  } as unknown as Response
}

describe('error mapping', () => {
  it('maps a 401 with no request_id (the real 401 shape)', async () => {
    fetchMock.mockResolvedValue(fakeResponse(401, JSON.stringify({ detail: 'Invalid or missing API key' })))
    await expect(request('/tasks')).rejects.toMatchObject({
      status: 401,
      detail: 'Invalid or missing API key',
      requestId: null,
    })
  })

  it('captures request_id on a 404', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse(404, JSON.stringify({ detail: 'Task not found', request_id: 'abc-123' })),
    )
    await expect(request('/tasks/9')).rejects.toMatchObject({
      status: 404,
      detail: 'Task not found',
      requestId: 'abc-123',
    })
  })

  it('treats a 422 detail as a plain string, never an array', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse(422, JSON.stringify({ detail: 'body.title: String should have at least 1 character' })),
    )
    const err = await request('/tasks', { method: 'POST', body: {} }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiClientError)
    expect(typeof (err as ApiClientError).detail).toBe('string')
  })

  it('turns a network failure into status 0 instead of crashing', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(request('/tasks')).rejects.toMatchObject({ status: 0 })
  })

  it('returns undefined for 204 without parsing a body', async () => {
    fetchMock.mockResolvedValue(fakeResponse(204, null))
    await expect(request('/tasks/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})

describe('auth header + global 401 routing', () => {
  it('attaches X-API-Key when a key is set', async () => {
    setApiKey('k-123')
    fetchMock.mockResolvedValue(fakeResponse(200, '[]'))
    await request('/tasks')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe('k-123')
  })

  it('fires the unauthorized handler on a stored-key 401', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    setApiKey('bad')
    fetchMock.mockResolvedValue(fakeResponse(401, JSON.stringify({ detail: 'Invalid or missing API key' })))
    await expect(request('/tasks')).rejects.toBeInstanceOf(ApiClientError)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does NOT fire the handler on an override-key 401 (Connect validation)', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    fetchMock.mockResolvedValue(fakeResponse(401, JSON.stringify({ detail: 'Invalid or missing API key' })))
    await expect(request('/tasks', { apiKey: 'explicit' })).rejects.toBeInstanceOf(ApiClientError)
    expect(handler).not.toHaveBeenCalled()
  })
})
