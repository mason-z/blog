import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const blogRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@blog-theme': path.join(blogRoot, 'themes/tony-blog/source'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8770',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
