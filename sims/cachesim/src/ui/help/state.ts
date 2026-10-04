/** Help UI state: whether the Help page is open, and the last "try this" failure. */
import { signal } from '@preact/signals';

export const helpOpen = signal(false);

/** A readable failure from the last "try this" action, shown under the header. */
export const helpNotice = signal<string | null>(null);
