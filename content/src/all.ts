/**
 * Every topic's content at once, statically imported. For the content checks, the app's
 * tests, and scripts; the app itself loads topics on demand (`load.ts`), so importing this
 * from app code would put every lesson back in the main bundle.
 */
import type { TopicContent } from './topic';
import { TOPIC_CONTENT } from './topics';

export { TOPIC_CONTENT };

const BY_ID: ReadonlyMap<string, TopicContent> = new Map(TOPIC_CONTENT.map((c) => [c.topicId, c] as const));

/** The content for a topic, or undefined when it is not written yet. */
export function contentFor(topicId: string): TopicContent | undefined {
  return BY_ID.get(topicId);
}
