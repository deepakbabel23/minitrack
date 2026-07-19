/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the MiniTrack API. Defaults to http://127.0.0.1:8000.
   *
   * Note there is deliberately no VITE_API_KEY: everything in a VITE_* variable
   * is inlined into the client bundle and shipped to every visitor.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
