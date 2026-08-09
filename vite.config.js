import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        adDetail: resolve(__dirname, 'ad-detail.html')
      }
    }
  },
  server: { open: true }
});
