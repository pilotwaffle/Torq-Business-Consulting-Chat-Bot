/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiBase = env.VITE_TORQ_API_BASE || 'http://localhost:8787';
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), tailwindcss()],
    define: {
      // BFF base URL only — never inject ANTHROPIC_API_KEY into the client bundle.
      'process.env.VITE_TORQ_API_BASE': JSON.stringify(apiBase),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './test-setup.ts',
      // BFF has its own package + vitest config; do not run server tests in the client suite.
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/server/**',
      ],
    },
  };
});
