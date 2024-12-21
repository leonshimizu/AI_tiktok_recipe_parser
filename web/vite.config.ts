import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // Proxy each route to your Flask server at :3000
      '/register': {
        target: 'http://127.0.0.1:3000',  // or localhost
        changeOrigin: true,
      },
      '/login': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/favorites': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/extract': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      // If you want a wildcard catch-all, you could do:
      // '/': {
      //   target: 'http://127.0.0.1:3000',
      //   changeOrigin: true,
      // },
    },
  },
});
