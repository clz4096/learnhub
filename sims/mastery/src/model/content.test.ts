/// <reference types="node" />
/**
 * The content store: one download per topic, shared by concurrent callers, forgotten on
 * failure so a retry downloads again; and the app's code never imports every topic.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTENT_IDS, type TopicContent } from '@learnhub/content';
import { contentFor } from '@learnhub/content/all';
import { contentStore, createContentStore, createRetryingLoader, failedModuleUrl, prefetchContent } from '@/model/content';

const fractions = contentFor('pre.fractions') as TopicContent;

describe('the content store', () => {
  it('downloads a topic once, and concurrent callers share the download', async () => {
    let calls = 0;
    const store = createContentStore(async () => { calls++; return fractions; });
    expect(store.loaded('pre.fractions')).toBeUndefined();
    const [a, b] = await Promise.all([store.load('pre.fractions'), store.load('pre.fractions')]);
    expect(a).toBe(fractions);
    expect(b).toBe(fractions);
    expect(await store.load('pre.fractions')).toBe(fractions);
    expect(store.loaded('pre.fractions')).toBe(fractions);
    expect(calls).toBe(1);
  });

  it('forgets a failed download, so the next call tries again', async () => {
    let calls = 0;
    const store = createContentStore(async () => {
      calls++;
      if (calls === 1) throw new Error('offline');
      return fractions;
    });
    await expect(store.load('pre.fractions')).rejects.toThrow('offline');
    expect(store.loaded('pre.fractions')).toBeUndefined();
    expect(await store.load('pre.fractions')).toBe(fractions);
    expect(calls).toBe(2);
  });

  it('prefetch downloads each written topic once, skips unwritten ones, and swallows failures', async () => {
    const asked: string[] = [];
    const store = createContentStore(async (id) => {
      asked.push(id);
      if (id === 'pre.indices') throw new Error('offline');
      return fractions;
    });
    prefetchContent(['pre.fractions', 'pre.fractions', 'prob.poisson-distribution', 'pre.indices'], store);
    await new Promise((r) => setTimeout(r, 0));
    expect(asked).toEqual(['pre.fractions', 'pre.indices']);
    expect(store.loaded('pre.fractions')).toBe(fractions);
  });

  it('the app store loads every topic from its own module', async () => {
    for (const id of CONTENT_IDS) expect((await contentStore.load(id))?.topicId).toBe(id);
  });
});

describe('retrying a failed download', () => {
  const URL_ = 'http://127.0.0.1:4173/sims/mastery/assets/fractions-AbC123.js';
  const fail = (): never => { throw new TypeError(`Failed to fetch dynamically imported module: ${URL_}`); };

  it('reads the chunk URL from the browser\'s error, without a query', () => {
    expect(failedModuleUrl(new TypeError(`Failed to fetch dynamically imported module: ${URL_}`))).toBe(URL_);
    expect(failedModuleUrl(`error loading dynamically imported module: ${URL_}?retry=5`)).toBe(URL_);
    expect(failedModuleUrl(new TypeError('Importing a module script failed.'))).toBeNull();
  });

  it('after a failure, imports the same chunk under a new URL and finds the topic among its exports', async () => {
    const urls: string[] = [];
    let calls = 0;
    const loader = createRetryingLoader(async () => { calls++; return fail(); }, async (u) => { urls.push(u); return { a: 1, x: fractions }; });
    await expect(loader('pre.fractions')).rejects.toThrow(/Failed to fetch/);
    expect(await loader('pre.fractions')).toBe(fractions);
    expect(calls).toBe(1);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toMatch(new RegExp(`^${URL_.replace(/[.?]/g, '\\$&')}\\?retry=\\d+$`));
  });

  it('keeps the first URL when a retry fails too, and imports normally when the error names none', async () => {
    const urls: string[] = [];
    let tries = 0;
    const loader = createRetryingLoader(async () => fail(), async (u) => { urls.push(u); tries++; if (tries < 2) throw new TypeError(`Failed to fetch dynamically imported module: ${u}`); return { x: fractions }; });
    await expect(loader('pre.fractions')).rejects.toThrow();
    await expect(loader('pre.fractions')).rejects.toThrow();
    expect(await loader('pre.fractions')).toBe(fractions);
    expect(urls.every((u) => u.startsWith(`${URL_}?retry=`))).toBe(true);
    let plain = 0;
    const safari = createRetryingLoader(async () => { plain++; if (plain === 1) throw new TypeError('Importing a module script failed.'); return fractions; }, async () => { throw new Error('not used'); });
    await expect(safari('pre.fractions')).rejects.toThrow();
    expect(await safari('pre.fractions')).toBe(fractions);
  });
});

describe('code splitting', () => {
  it('no app source imports the static list of every topic (only tests may)', () => {
    const src = new URL('../', import.meta.url);
    const files: string[] = [];
    const walk = (dir: URL): void => {
      for (const name of readdirSync(dir)) {
        const u = new URL(name, dir);
        if (statSync(u).isDirectory()) walk(new URL(`${name}/`, dir));
        else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(u.pathname);
      }
    };
    walk(src);
    expect(files.length).toBeGreaterThan(20);
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/@learnhub\/content\/all|content\/src\/(?:all|topics)/);
  });
});
