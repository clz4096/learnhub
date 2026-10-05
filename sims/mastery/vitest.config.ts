import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    // Logic tests run in Node; component tests (.tsx) need a DOM.
    projects: [
      { extends: true, test: { name: 'node', include: ['src/**/*.test.ts'], environment: 'node' } },
      // The glossary renders every term with KaTeX; under a full parallel run its tests take
      // 3 to 5 seconds, so the default 5-second limit fails them by contention alone.
      { extends: true, test: { name: 'dom', include: ['src/**/*.test.tsx'], environment: 'jsdom', testTimeout: 15_000 } },
    ],
  },
});
