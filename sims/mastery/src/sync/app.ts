/**
 * Sync wired into the app: the bundled config, the status the views show, and the one
 * engine. With no config, nothing here runs: no request, no listener, no change to the
 * URL, and the Progress page says only that sync is not set up.
 */
import { signal } from '@preact/signals';
import { finishOpenPlacement, withoutSelfReport, withoutStaleLapses } from '@/model/learner';
import { onLearnerChange } from '@/model/learnerChange';
import { go } from '@/model/route';
import { KNOWN_IDS, applySynced, keyValueStorage, loadState, now, onLocalChange, progress } from '@/model/store';
import { bundledSyncConfig, type ConfigResult } from './config';
import { SyncEngine, type SyncStatus } from './engine';
import { applyLearner, collectLearner, startTracking } from './local';
import { readAuthFragment, type FragmentResult } from './supabase';

/** The config the build carries; tests replace it. */
export const syncSetup = signal<ConfigResult>(bundledSyncConfig());

export const syncStatus = signal<SyncStatus>({
  phase: 'signed-out', email: null, lastSyncedAt: null, pending: false, linkSentTo: null, message: null, remoteErrors: [],
});

/**
 * True when the app runs from the Home Screen (iOS `navigator.standalone`, or the
 * standalone display mode elsewhere). Such an app keeps its storage apart from the
 * browser's, and the emailed link opens in the browser, so only a password or the code
 * signs it in.
 */
export function detectStandalone(): boolean {
  if (typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
}

/** Read once at load; tests replace it. */
export const standaloneApp = signal<boolean>(detectStandalone());

let engine: SyncEngine | null = null;
let unlisten: (() => void) | null = null;

/** The page a sign-in link returns to: this page, without its route. */
function pageUrl(): string {
  return `${location.origin}${location.pathname}`;
}

/**
 * Takes a sign-in result out of the URL fragment before anything else reads it, and
 * replaces the entry, so the tokens leave the address bar and the history at once.
 * Returns null, touching nothing, when sync is off or the fragment is an ordinary route.
 */
export function takeAuthFragment(): FragmentResult | null {
  if (syncSetup.value.config === null || typeof location === 'undefined') return null;
  const r = readAuthFragment(location.hash, now());
  if (r === null) return null;
  history.replaceState(null, '', `${location.pathname}${location.search}#/progress`);
  go({ view: 'progress' }, { replace: true });
  return r;
}

/**
 * Starts sync once the local document has loaded. Does nothing when sync is off or the
 * local document could not be read (merging into it could hide the problem).
 */
export async function startSync(loaded: Promise<void>, fragment: FragmentResult | null, deps: { fetch?: typeof fetch } = {}): Promise<void> {
  const config = syncSetup.value.config;
  if (config === null) return;
  await loaded;
  if (loadState.value !== 'ready') return;
  stopSync();
  startTracking();
  const e = new SyncEngine({
    config,
    fetch: deps.fetch ?? ((url, init) => fetch(url, init)),
    storage: keyValueStorage(),
    now,
    timers: { set: (f, ms) => setTimeout(f, ms), clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) },
    getLocal: () => progress.value,
    apply: applySynced,
    normalize: (p) => withoutStaleLapses(withoutSelfReport(finishOpenPlacement(p, now())).progress),
    knownTopicIds: KNOWN_IDS,
    redirectTo: typeof location === 'undefined' ? '' : pageUrl(),
    onStatus: (s) => { syncStatus.value = s; },
    isOnline: () => typeof navigator === 'undefined' || navigator.onLine !== false,
    learner: { get: collectLearner, apply: applyLearner },
  });
  engine = e;
  const offProgress = onLocalChange(() => e.localChanged());
  // Registered after tracking's listener, so the change is recorded before the round reads it.
  const offLearner = onLearnerChange(() => e.localChanged());
  const offChange = (): void => { offProgress(); offLearner(); };
  const onOnline = (): void => e.online();
  if (typeof window !== 'undefined') window.addEventListener('online', onOnline);
  unlisten = () => {
    offChange();
    if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
    e.stop();
  };
  await e.start(fragment);
}

export function stopSync(): void {
  unlisten?.();
  unlisten = null;
  engine = null;
}

/**
 * The last email this device signed in with or sent a sign-in email to, so the form can
 * offer it again (and iOS Keychain can match it). Only the address is kept, never a password.
 */
export const LAST_EMAIL_KEY = 'mastery.syncemail.v1';

export function rememberedEmail(): string {
  try {
    return typeof localStorage === 'undefined' ? '' : localStorage.getItem(LAST_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

function rememberEmail(email: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LAST_EMAIL_KEY, email.trim());
  } catch {
    // Storage refused: the form starts empty next time.
  }
}

/** Runs a sign-in step and remembers the address when it worked. */
async function remembering(email: string, f: () => Promise<string | null>): Promise<string | null> {
  const err = await f();
  if (err === null) rememberEmail(email);
  return err;
}

const OFF = (): Promise<string | null> => Promise.resolve('Sync is not set up.');

export const signIn = (email: string): Promise<string | null> => {
  const e = engine;
  return e === null ? OFF() : remembering(email, () => e.signIn(email));
};
export const signInWithCode = (email: string, code: string): Promise<string | null> => {
  const e = engine;
  return e === null ? OFF() : remembering(email, () => e.signInWithCode(email, code));
};
export const signInWithPassword = (email: string, password: string): Promise<string | null> => {
  const e = engine;
  return e === null ? OFF() : remembering(email, () => e.signInWithPassword(email, password));
};
export const setPassword = (password: string): Promise<string | null> => engine?.setPassword(password) ?? OFF();
export const signOut = (): Promise<void> => engine?.signOut() ?? Promise.resolve();
export const syncNow = (): Promise<void> => engine?.syncNow() ?? Promise.resolve();
