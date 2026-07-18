// Runs once before the test suite (configured as `setupFiles` in vite.config.ts).
// Adds jest-dom's custom matchers (e.g. toBeInTheDocument, toHaveTextContent)
// to Vitest's `expect`, so component tests can assert on the rendered DOM.
import '@testing-library/jest-dom'

// jsdom doesn't implement the native <dialog> methods our ConfirmDialog uses.
// Provide minimal stand-ins so components that open a dialog can be tested.
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '')
    }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open')
    }
  }
}
