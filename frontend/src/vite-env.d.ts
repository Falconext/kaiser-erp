/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_PUBLIC_BRAND?: string
  readonly VITE_WS_URL?: string
  readonly VITE_VENDIFY_DESKTOP?: string
  readonly VITE_DISABLE_PUBLIC_BRANDING_FETCH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __APP_VERSION__: string
