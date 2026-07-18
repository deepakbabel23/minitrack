import { describe, it, expect } from 'vitest'

// Smoke test: proves the Vitest toolchain runs. Real tests arrive in Phase 4.
describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })
})
