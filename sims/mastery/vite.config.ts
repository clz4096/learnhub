import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { standupIcs } from './src/model/standupIcs';

/**
 * Writes public/standup.ics (the standup's calendar subscription) when a build or the dev
 * server starts, so Vite publishes it beside index.html. Generated, so not committed: its
 * stamp and yom tov exclusions follow the build date.
 */
function standupCalendar(): Plugin {
  return {
    name: 'standup-ics',
    buildStart() {
      const dir = fileURLToPath(new URL('./public/', import.meta.url));
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}standup.ics`, standupIcs(Date.now()));
    },
  };
}

// Relative base so the build can be served from any path.
export default defineConfig({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [standupCalendar(), preact()],
  build: { target: 'es2022' },
  server: { host: '0.0.0.0' },
});
