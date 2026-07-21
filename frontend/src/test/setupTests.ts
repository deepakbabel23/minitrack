import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { setApiKeyProvider, setUnauthorizedHandler } from "../api/client";
import * as apiKeyStore from "../auth/apiKeyStore";

/**
 * jsdom's <dialog> support varies by version — older builds throw
 * "Not implemented: HTMLDialogElement.prototype.showModal".
 *
 * Feature-detected on purpose: overriding unconditionally would clobber a real
 * implementation and break the native `cancel` event that ConfirmDialog relies
 * on. The npm `dialog-polyfill` package is deliberately avoided; it wants real
 * CSS and layout, which jsdom doesn't do.
 */
if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
      this.open = true;
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close(
      this: HTMLDialogElement,
      returnValue?: string,
    ) {
      this.open = false;
      this.removeAttribute("open");
      if (returnValue !== undefined) this.returnValue = returnValue;
      this.dispatchEvent(new Event("close"));
    };
  }
}

/**
 * The API client and the auth store are module singletons, so state set by one
 * test survives into the next within the same file. Reset all of it.
 */
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setApiKeyProvider(null);
  setUnauthorizedHandler(null);
  apiKeyStore.disconnect();
  try {
    window.sessionStorage.clear();
  } catch {
    // Nothing to clear if storage is unavailable.
  }
});
