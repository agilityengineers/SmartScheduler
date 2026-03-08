import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.tsx'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'email-integration': resolve(__dirname, 'src/content/email-integration.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'popup') return 'popup.js';
          if (chunkInfo.name === 'service-worker') return 'background/service-worker.js';
          if (chunkInfo.name === 'email-integration') return 'content/email-integration.js';
          return '[name].js';
        },
        // Chrome extensions don't support chunking for content scripts
        // Each entry point must be self-contained
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            if (assetInfo.name.includes('email-integration')) {
              return 'content/email-integration.css';
            }
            return 'popup.css';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    // Content scripts and service workers must be self-contained
    target: 'chrome120',
    minify: false, // Easier to debug during development
    sourcemap: 'inline',
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});
