import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const appVersion =
  process.env.VITE_APP_VERSION ||
  process.env.COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  String(Date.now())

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'falconext-version-file',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({
            version: appVersion,
            builtAt: new Date().toISOString(),
          }),
        })
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    port: 5184,
    host: '0.0.0.0',
    open: 'http://localhost:5184/login',
    strictPort: true,
    // '.vendify.pe' permite cualquier subdominio de reseller white-label
    // (ej. losandes.vendify.pe) apuntado a 127.0.0.1 en /etc/hosts.
    allowedHosts: ['localhost', '.vendify.pe'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['@monaco-editor/react'],
  },
})
