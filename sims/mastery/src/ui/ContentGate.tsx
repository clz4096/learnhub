/**
 * Shows a topic's content once its chunk has downloaded: a short loading line while it
 * downloads, and an error with Try again if the download fails (offline, or a deploy
 * replaced the chunk). Content already downloaded shows at once, with no loading line.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { TopicContent } from '@learnhub/content';
import { contentStore, type ContentStore } from '@/model/content';

export type ContentState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'missing' }
  | { kind: 'ready'; content: TopicContent };

/** The download state of a topic's content, and a retry for a failed download. */
export function useTopicContent(topicId: string, store: ContentStore = contentStore): { state: ContentState; retry: () => void } {
  const now = (): ContentState => {
    const c = store.loaded(topicId);
    return c === undefined ? { kind: 'loading' } : { kind: 'ready', content: c };
  };
  const [got, setGot] = useState<{ topicId: string; state: ContentState }>(() => ({ topicId, state: now() }));
  const [attempt, setAttempt] = useState(0);
  // A new topic starts from what the store has, not from the last topic's state.
  const state = got.topicId === topicId ? got.state : now();
  useEffect(() => {
    if (state.kind === 'ready') return undefined;
    let live = true;
    store.load(topicId).then(
      (c) => { if (live) setGot({ topicId, state: c === undefined ? { kind: 'missing' } : { kind: 'ready', content: c } }); },
      () => { if (live) setGot({ topicId, state: { kind: 'error' } }); },
    );
    return () => { live = false; };
  }, [topicId, attempt, store]);
  const retry = (): void => {
    setGot({ topicId, state: { kind: 'loading' } });
    setAttempt((n) => n + 1);
  };
  return { state, retry };
}

/** The state of a download that is not ready: the loading line, the error with Try again, or "not in the app". */
export function ContentStatus({ state, retry, what }: { state: Exclude<ContentState, { kind: 'ready' }>; retry: () => void; what: string }) {
  switch (state.kind) {
    case 'loading': return <p class="content-loading small muted" role="status">Loading the {what}…</p>;
    case 'missing': return <p class="content-error">This {what} is not in the app any more.</p>;
    case 'error':
      return (
        <div class="content-error" role="alert">
          <p>The {what} could not be loaded. Check the connection, then try again. If it keeps failing, reload the page: the app may have been updated.</p>
          <button type="button" class="btn btn-primary" onClick={retry}>Try again</button>
        </div>
      );
  }
}

/** Renders `children` with the topic's content, or the loading, error, or missing state in its place. */
export function ContentGate({ topicId, what = 'lesson', store, children }: {
  topicId: string;
  /** What is loading, in the messages: "lesson", "review", "quiz item", "problem". */
  what?: string;
  store?: ContentStore;
  children: (c: TopicContent) => ComponentChildren;
}) {
  const { state, retry } = useTopicContent(topicId, store);
  return state.kind === 'ready' ? <>{children(state.content)}</> : <ContentStatus state={state} retry={retry} what={what} />;
}
