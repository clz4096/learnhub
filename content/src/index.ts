export * from './rich';
export * from './problem';
export * from './topic';
export * from './glossary';
export { TOPIC_CONTENT } from './topics';

import type { TopicContent } from './topic';
import { TOPIC_CONTENT } from './topics';

const BY_ID: ReadonlyMap<string, TopicContent> = new Map(TOPIC_CONTENT.map((c) => [c.topicId, c] as const));

/** The content for a topic, or undefined when it is not written yet. */
export function contentFor(topicId: string): TopicContent | undefined {
  return BY_ID.get(topicId);
}
