/**
 * Topic content, downloaded on demand. Each lesson is its own chunk, so the app's first
 * load carries no lesson; a lesson is fetched the first time it opens, then kept here for
 * the tab. The browser's HTTP cache keeps the chunk after that, so a lesson opened once
 * also opens offline. Today prefetches the topics in the day's plan, so a session started
 * online can continue offline.
 *
 * Which topics have content, and the titles of their Cambridge problems, come from the
 * content package's catalog and need no download.
 */
import { hasContent, loadTopicContent, type TopicContent } from '@learnhub/content';

export type Loader = (topicId: string) => Promise<TopicContent | undefined>;

export interface ContentStore {
  /** The content if it is already downloaded, else undefined. */
  loaded(topicId: string): TopicContent | undefined;
  /**
   * Downloads a topic's content once; concurrent calls share the download. Resolves to
   * undefined for a topic without content. A failed download rejects and is forgotten, so
   * the next call tries again.
   */
  load(topicId: string): Promise<TopicContent | undefined>;
}

export function createContentStore(loader: Loader): ContentStore {
  const done = new Map<string, TopicContent>();
  const pending = new Map<string, Promise<TopicContent | undefined>>();
  return {
    loaded: (topicId) => done.get(topicId),
    load(topicId) {
      const have = done.get(topicId);
      if (have !== undefined) return Promise.resolve(have);
      const inFlight = pending.get(topicId);
      if (inFlight !== undefined) return inFlight;
      const p = loader(topicId).then(
        (c) => {
          pending.delete(topicId);
          if (c !== undefined) done.set(topicId, c);
          return c;
        },
        (e: unknown) => {
          pending.delete(topicId);
          throw e;
        },
      );
      pending.set(topicId, p);
      return p;
    },
  };
}

/** The URL of the module a failed dynamic import names in its error, without any query; null when the message has none. */
export function failedModuleUrl(error: unknown): string | null {
  const m = /(https?:\/\/[^\s?'"]+\.(?:js|mjs|ts))/.exec(String(error));
  return m === null ? null : (m[1] as string);
}

/**
 * A loader that can retry. A browser remembers a module whose download failed and fails
 * every later import of the same URL without trying the network again (Chrome does), so
 * "Try again" would never work. After a failure, the next attempt imports the chunk's URL,
 * taken from the error, with a query added, and picks the topic out of its exports.
 * Where the error names no URL, it simply imports again.
 */
export function createRetryingLoader(load: Loader, importUrl: (url: string) => Promise<Record<string, unknown>>): Loader {
  const failed = new Map<string, unknown>();
  return async (topicId) => {
    const before = failed.get(topicId);
    const url = before === undefined ? null : failedModuleUrl(before);
    try {
      let c: TopicContent | undefined;
      if (url === null) c = await load(topicId);
      else {
        const mod = await importUrl(`${url}?retry=${Date.now()}`);
        c = Object.values(mod).find((v): v is TopicContent => typeof v === 'object' && v !== null && (v as { topicId?: unknown }).topicId === topicId);
        if (c === undefined) throw new Error(`no content for ${topicId} in ${url}`);
      }
      failed.delete(topicId);
      return c;
    } catch (e) {
      // Keep the URL from the first failure: a retry's own error carries the retry's query.
      failed.set(topicId, url === null ? e : before);
      throw e;
    }
  };
}

/** The app's store, loading from the content package's chunks. */
export const contentStore: ContentStore = createContentStore(createRetryingLoader(loadTopicContent, (url) => import(/* @vite-ignore */ url) as Promise<Record<string, unknown>>));

/** Starts downloading topics in the background, ignoring failures: a lesson that is opened later shows its own error. */
export function prefetchContent(topicIds: readonly string[], store: ContentStore = contentStore): void {
  for (const id of new Set(topicIds)) if (hasContent(id)) store.load(id).catch(() => undefined);
}
