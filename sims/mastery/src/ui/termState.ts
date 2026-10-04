/** Which glossary term is open in the in-place definition dialog, so a lesson never loses its place. */
import { signal } from '@preact/signals';

export const termOpen = signal<string | null>(null);

export function openTerm(id: string): void {
  termOpen.value = id;
}

export function closeTerm(): void {
  termOpen.value = null;
}
