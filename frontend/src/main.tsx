import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// App shell first, so the delivered design system wins on any overlap.
import "./styles/app-shell.css";
// The whole design layer: index.css @imports tokens -> typography -> components.
import "./styles/index.css";

import App from "./App";
import { setApiKeyProvider } from "./api/client";
import * as apiKeyStore from "./auth/apiKeyStore";
import { ApiKeyProvider } from "./auth/ApiKeyContext";

// Restore an opted-in key before React mounts, so a reload doesn't flash
// /connect on the way back to /tasks.
apiKeyStore.hydrateFromSession();

// Wire the API layer to the auth store here rather than inside a component:
// client.ts pulls the key per request, which removes any dependency on effect
// ordering (React runs child effects before parent effects).
setApiKeyProvider(apiKeyStore.getKey);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ApiKeyProvider>
        <App />
      </ApiKeyProvider>
    </BrowserRouter>
  </StrictMode>,
);
