import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApiKeyProvider } from './auth/ApiKeyContext'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.tsx'

// The single entry point. BrowserRouter turns URL changes into React renders
// without a full page reload — that's how MiniTrack has multiple "screens"
// while staying one downloaded app. ApiKeyProvider wraps everything so any
// screen can read the connection state.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ApiKeyProvider>
        <App />
      </ApiKeyProvider>
    </BrowserRouter>
  </StrictMode>,
)
