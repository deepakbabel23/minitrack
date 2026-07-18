// Runs once before the test suite (configured as `setupFiles` in vite.config.ts).
// Adds jest-dom's custom matchers (e.g. toBeInTheDocument, toHaveTextContent)
// to Vitest's `expect`, so component tests can assert on the rendered DOM.
import '@testing-library/jest-dom'
