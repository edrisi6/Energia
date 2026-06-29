import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// During development, the frontend runs on port 5173 and the backend API on
// 4000. This proxy forwards any request starting with /api to the backend, so
// the browser sees a single origin and we avoid CORS headaches in dev.
export default defineConfig({
  plugins: [
    react(),
    // Makes the app installable and adds an offline app shell. Workbox
    // precaches the built assets; API calls (/api/*) are never cached so data
    // stays fresh and authenticated.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Never serve API responses from the cache.
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'Vehicle Fleet Manager',
        short_name: 'Fleet',
        description: 'Manage your company vehicle fleet.',
        theme_color: '#2563eb',
        background_color: '#2563eb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
