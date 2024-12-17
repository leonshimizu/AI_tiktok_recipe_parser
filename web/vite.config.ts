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
      '/extract': {
        target: 'http://127.0.0.1:3000',  // use 127.0.0.1 or localhost
        changeOrigin: true
      }
    }
  }
});
