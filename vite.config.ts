import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Tauri expects a fixed port + no HMR webSocket over a separate port.
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  // Monaco / monaco-yaml / parse workers are imported with `?worker` and must be ES modules (§9.2).
  worker: { format: 'es' },
  build: { target: 'chrome105', sourcemap: false },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: [...configDefaults.exclude, 'tests/fixtures/**'],
  },
})
