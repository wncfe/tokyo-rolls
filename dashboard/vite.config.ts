import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://tokyo-backend:8000',
        changeOrigin: true,
        headers: {
          Host: 'localhost',
        },
      },
    },
  },
});
