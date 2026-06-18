import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: '/Aladzan-Home-Schooling-App/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'docs',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'firebase-vendor';
              if (id.includes('@google/genai')) return 'ai-vendor';
              if (id.includes('lucide-react')) return 'icons-vendor';
              if (id.includes('motion')) return 'motion-vendor';
              if (id.includes('react-dom')) return 'react-dom-vendor';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // File watching is disabled when DISABLE_HMR is true to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
