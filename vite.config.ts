/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/kraken-api': {
        target: 'https://api.kraken.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kraken-api/, ''),
      },
      '/yahoo': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yahoo/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      },
    },
  },
  test: {
    environment: 'node',
  },
});
