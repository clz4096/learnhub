import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Relative base so the build can be served from any path.
export default defineConfig({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [preact()],
  build: { target: 'es2022' },
  server: { host: '0.0.0.0' },
});
