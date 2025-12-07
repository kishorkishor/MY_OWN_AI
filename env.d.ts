/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ZAI_API_KEY: string;
  readonly VITE_ZAI_MODEL?: string;
  readonly VITE_ZAI_API_URL?: string;
  readonly VITE_ZAI_THINKING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

