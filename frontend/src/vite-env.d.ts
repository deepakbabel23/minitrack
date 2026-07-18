/// <reference types="vite/client" />

// Make our custom env var strongly typed wherever we read import.meta.env.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
