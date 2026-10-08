import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5180,
    strictPort: true,
    // In development the Vue app calls /api/... and Vite forwards it to Express.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
