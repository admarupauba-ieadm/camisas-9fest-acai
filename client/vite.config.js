import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    },
    fs: {
      // permite importar shared/tamanhos.js da raiz do projeto no dev
      allow: ['..']
    }
  }
});
