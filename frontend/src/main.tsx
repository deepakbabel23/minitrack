import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// App shell first, so the delivered design system wins on any overlap.
import "./styles/app-shell.css";
// The whole design layer: index.css @imports tokens -> typography -> components.
import "./styles/index.css";

import App from "./App";
import { setApiKeyProvider, setUnauthorizedHandler } from "./api/client";
import * as apiKeyStore from "./auth/apiKeyStore";
import { ApiKeyProvider } from "./auth/ApiKeyContext";

// Restore an opted-in key before React mounts, so a reload doesn't flash
// /connect on the way back to /tasks.
apiKeyStore.hydrateFromSession();

// Wire the API layer to the auth store here rather than inside a component:
// client.ts pulls the key per request, which removes any dependency on effect
// ordering (React runs child effects before parent effects).
setApiKeyProvider(apiKeyStore.getKey);

/**
 * A key that stops working mid-session (revoked, rotated, expired) must reset
 * the session rather than show an error in place — otherwise the user is stuck
 * on a screen that can never load.
 *
 * No router instance is needed out here: clearing the store re-renders the
 * context, `isConnected` flips false, and ProtectedRoute performs the redirect
 * declaratively. The client only fires this for requests that used the STORED
 * key, so validating a candidate key on /connect can't trip it.
 */
setUnauthorizedHandler(() => {
  apiKeyStore.disconnect("Your API key was rejected — please reconnect.");
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ApiKeyProvider>
        <App />
      </ApiKeyProvider>
    </BrowserRouter>
  </StrictMode>,
);
