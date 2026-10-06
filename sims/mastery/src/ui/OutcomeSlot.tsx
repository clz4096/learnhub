/**
 * The mount point for the outcome dashboard on the You tab. The dashboard is its own
 * component, built separately: when `src/ui/OutcomePanel.tsx` exists and exports
 * `OutcomePanel`, it renders here with the progress document; until then the slot renders
 * nothing. Found at build time (Vite's glob import), so adding the file needs no edit here.
 */
import type { ComponentType } from 'preact';
import type { Progress } from '@learnhub/mastery';

export type OutcomePanelProps = { p: Progress };

const found = import.meta.glob<{ OutcomePanel?: ComponentType<OutcomePanelProps> }>('./OutcomePanel.tsx', { eager: true });
export const OutcomePanel: ComponentType<OutcomePanelProps> | null = Object.values(found)[0]?.OutcomePanel ?? null;

export function OutcomeSlot({ p }: OutcomePanelProps) {
  if (OutcomePanel === null) return null;
  return <div class="ds-outcome" data-slot="OutcomePanel"><OutcomePanel p={p} /></div>;
}
