/**
 * The campaign's state in a signal, kept in localStorage in this browser only. Not part of
 * the progress document, so its schema and sync are unchanged; syncing the campaign across
 * devices is a follow-up.
 */
import { signal } from '@preact/signals';
import { parseCampaign, type Campaign } from './campaign';

export const CAMPAIGN_KEY = 'mastery.campaign.v1';

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadCampaign(): Campaign | null {
  try {
    return parseCampaign(store()?.getItem(CAMPAIGN_KEY) ?? null);
  } catch {
    return null;
  }
}

export const campaign = signal<Campaign | null>(loadCampaign());

/** Re-reads storage (tests, and another tab's changes). */
export function reloadCampaign(): void {
  campaign.value = loadCampaign();
}

/** Replaces the campaign and saves it; false when the browser would not keep it. */
export function saveCampaign(next: Campaign | null): boolean {
  campaign.value = next;
  try {
    const s = store();
    if (s === null) return false;
    if (next === null) s.removeItem(CAMPAIGN_KEY);
    else s.setItem(CAMPAIGN_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
