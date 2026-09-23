import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

const WORKER_PORT = 8787;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../public',
    emptyOutDir: false,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': `http://127.0.0.1:${WORKER_PORT}`,
      '/vendor': `http://127.0.0.1:${WORKER_PORT}`,
    },
  },
});