import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    cors: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://10.36.117.18:3000',
        changeOrigin: true,
      },
    },
  },
});
