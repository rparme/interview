import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ command }) => ({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // In dev mode proxy /rest/v1/* → local PostgREST on port 3000.
  // The rewrite strips the prefix so PostgREST receives plain table paths (e.g. /categories).
  // In production the real Supabase URL is used directly — no proxy involved.
  ...(command === 'serve' && {
    server: {
      watch: {
        // inotify doesn't work on Windows-mounted drives (/mnt/c/) in WSL2.
        // Polling is slower but reliable; 300ms is a good balance.
        usePolling: true,
        interval: 300,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/rest/v1': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/rest\/v1/, ''),
        },
        // Auth calls (login, signup, OAuth) → GoTrue on port 9999.
        // GoTrue serves at root, so the /auth/v1 prefix is stripped.
        '/auth/v1': {
          target: 'http://localhost:9999',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/auth\/v1/, ''),
        },
      },
    },
  }),
}))
