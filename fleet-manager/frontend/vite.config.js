import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development, the frontend runs on port 5173 and the backend API on
// 4000. This proxy forwards any request starting with /api to the backend, so
// the browser sees a single origin and we avoid CORS headaches in dev.
export default defineConfig({
  plugins: [react()],
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
