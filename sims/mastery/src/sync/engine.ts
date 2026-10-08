/**
 * Sync between devices: pull the learner's copy from Supabase, merge it with this
 * device's (`mergeProgress`), save the result here, and push it back.
 *
 * When: on app open, right after sign-in, a moment after each change the learner makes
 * (a lesson, review, quiz, supervision import, settings), on "Sync now", and when the
 * browser comes back online. Nothing waits on it: the app saves locally first, as before,
 * and sync runs behind.
 *
 * Offline: the document is a merge of everything, so the queue of changes is just a flag,
 * "this device has work the server may not have", kept with the session so it survives a
 * reload. Any later successful round pushes it all. Failed rounds that may succeed later
 * (no connection, server errors, rate limits) are retried with exponential backoff.
 *
 * Trust: the remote copy is untrusted input. It is validated by the same importer as a
 * progress file and is never merged when malformed; the problem is reported and nothing
 * is pushed over it, since it may be a newer build's document that this one cannot read.
 *
 * Tokens: the session (access and refresh token) is kept in IndexedDB beside progress.
 * sessionStorage would ask for a new email link in every new tab, which defeats sync's
 * purpose of being easier than copying a file; localStorage is no safer against script
 * on the page than IndexedDB. What limits the damage of a stolen token is row-level
 * security (one row of study progress) and Supabase's refresh token rotation.
 *
 * Passwords: the engine passes a password straight to GoTrue and keeps no copy. It is not
 * in the persisted state, the status, or any message, so it never reaches storage or the
 * synced row.
 *
 * One limit of the server write: the upsert replaces the row, so two devices pushing at
 * the same moment can overwrite each other's push. Neither loses work: each keeps its
 * merged copy locally and pushes it again on its next round, which merges the other's.
 *
 * The learner envelope (campaign, story, day log, timed ladder, mixed review, flags, lesson
 * places and write-up drafts: sync/learner) rides in the same row, beside the progress document's fields, and is
 * merged the same way (`mergeLearner`). An older build reads the row's progress and
 * ignores the envelope; when it pushes, its row has no envelope, and the next round of a
 * newer build puts the merged envelope back, since every device keeps its own copy.
 */
import {
  PROGRESS_VERSION, importProgress, mergeProgress, sameProgress,
  type Progress, type ProgressStorage,
} from '@learnhub/mastery';
import { joinDoc, splitDoc } from './backup';
import type { SyncConfig } from './config';
import { isEmptyLearner, mergeLearner, parseLearner, sameLearner, type LearnerState } from './learner/envelope';
import {
  SyncHttpError, cleanCode, logout, pullRow, pushRow, refreshSession, requestLink, signInWithPassword, updatePassword, verifyCode,
  type FetchLike, type FragmentResult, type Session,
} from './supabase';

export const SYNC_STATE_KEY = 'sync';
/** Below the table's 2 MiB check, with room for JSON whitespace differences on the server. */
export const MAX_SYNC_CHARS = 1_500_000;
/** A change is pushed this long after it, so a burst of changes is one round. */
export const DEBOUNCE_MS = 1500;
export const RETRY_BASE_MS = 2000;
export const RETRY_MAX_MS = 5 * 60_000;
/** Renew the access token this long before it expires. */
export const REFRESH_EARLY_MS = 60_000;
/** How long an emailed code works: Supabase's default "Email OTP Expiration", one hour. */
export const CODE_TTL_MS = 3600_000;
/** The shortest password the app sets. GoTrue's own minimum (6 by default) may be raised in the project. */
export const MIN_PASSWORD_CHARS = 8;
/** Said when the device has no connection, for the password forms. */
export const OFFLINE_TEXT = 'No connection. Check that this device is online, then try again.';

export type SyncPhase = 'signed-out' | 'idle' | 'syncing' | 'error';

export interface SyncStatus {
  phase: SyncPhase;
  email: string | null;
  /** ms since the epoch of the last round that ended in step with the server. */
  lastSyncedAt: number | null;
  /** This device has changes the server may not have yet. */
  pending: boolean;
  /** A sign-in email (link and code) was sent to this address and not used yet. */
  linkSentTo: string | null;
  /** What went wrong, in words for the learner. */
  message: string | null;
  /** Why the synced copy was refused, when it was malformed. */
  remoteErrors: string[];
}

export interface Timers {
  set(f: () => void, ms: number): unknown;
  clear(h: unknown): void;
}

export interface SyncDeps {
  config: SyncConfig;
  fetch: FetchLike;
  /** Holds the session and the pending flag (the app's IndexedDB store). */
  storage: ProgressStorage;
  now: () => number;
  timers: Timers;
  /** This device's document, read fresh each time. */
  getLocal: () => Progress | null;
  /** Saves a merged document locally without reporting it as a change of the learner's. */
  apply: (p: Progress) => Promise<void>;
  /** The app's load-time fix-ups (`finishOpenPlacement`, `withoutSelfReport`, `withoutStaleLapses`). Must be idempotent. */
  normalize: (p: Progress) => Progress;
  knownTopicIds: readonly string[];
  /** The page the sign-in link returns to. */
  redirectTo: string;
  onStatus: (s: SyncStatus) => void;
  isOnline?: () => boolean;
  /**
   * The learner envelope: `get` returns this device's, with its latest saves taken in;
   * `apply` saves a merged one without reporting it as a change of the learner's. Without
   * it, the synced envelope is carried through each push untouched.
   */
  learner?: {
    get: () => LearnerState;
    apply: (s: LearnerState) => void;
  };
}

interface Persisted {
  session: Session | null;
  pending: boolean;
  lastSyncedAt: number | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parsePersisted(raw: string | undefined): Persisted {
  const none: Persisted = { session: null, pending: false, lastSyncedAt: null };
  if (raw === undefined) return none;
  try {
    const o = JSON.parse(raw) as Partial<Persisted>;
    const s = o.session;
    const sessionOk = s !== null && typeof s === 'object' && typeof s?.accessToken === 'string' && typeof s.refreshToken === 'string'
      && typeof s.expiresAt === 'number' && typeof s.userId === 'string';
    return {
      session: sessionOk ? { ...s, email: typeof s.email === 'string' ? s.email : null } : null,
      pending: o.pending === true,
      lastSyncedAt: typeof o.lastSyncedAt === 'number' ? o.lastSyncedAt : null,
    };
  } catch {
    return none;
  }
}

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** The server refused the refresh token (spent, revoked, or the user removed): only a new link signs in. */
class SessionExpired extends Error {}

export class SyncEngine {
  private state: Persisted = { session: null, pending: false, lastSyncedAt: null };
  private status: SyncStatus = {
    phase: 'signed-out', email: null, lastSyncedAt: null, pending: false, linkSentTo: null, message: null, remoteErrors: [],
  };
  private running: Promise<void> | null = null;
  private again = false;
  private timer: unknown = null;
  private failures = 0;
  /** Counts the learner's changes, so a round knows whether one arrived while it ran. */
  private changes = 0;
  private stopped = false;
  /** The last sign-in email this engine sent, to tell an expired code from a mistyped one. */
  private codeSent: { email: string; at: number } | null = null;

  constructor(private readonly d: SyncDeps) {}

  getStatus(): SyncStatus {
    return this.status;
  }

  private emit(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch, pending: this.state.pending, lastSyncedAt: this.state.lastSyncedAt };
    this.d.onStatus(this.status);
  }

  private async persist(): Promise<void> {
    try {
      await this.d.storage.put(SYNC_STATE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage refused: sync still works this session, the learner signs in again next time.
    }
  }

  /**
   * Loads the saved session, takes a session from a sign-in redirect if there is one, and
   * runs the first round. Call after the local document has loaded.
   */
  async start(fragment: FragmentResult | null): Promise<void> {
    let raw: string | undefined;
    try {
      raw = await this.d.storage.get(SYNC_STATE_KEY);
    } catch {
      raw = undefined;
    }
    this.state = parsePersisted(raw);
    if (fragment?.kind === 'session') {
      this.state.session = fragment.session;
      await this.persist();
    }
    const message = fragment?.kind === 'error' ? fragment.message : null;
    if (this.state.session === null) {
      this.emit({ phase: 'signed-out', email: null, message });
      return;
    }
    this.emit({ phase: 'idle', email: this.state.session.email, message, linkSentTo: null });
    await this.syncNow();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) this.d.timers.clear(this.timer);
    this.timer = null;
  }

  /** Emails a sign-in link. Resolves to an error message for the form, or null when sent. */
  async signIn(email: string): Promise<string | null> {
    const e = email.trim();
    if (!EMAIL_RE.test(e)) return 'Enter an email address.';
    try {
      await requestLink(this.d.config, this.d.fetch, e, this.d.redirectTo);
    } catch (err) {
      const rate = err instanceof SyncHttpError && err.status === 429;
      return rate ? 'Too many sign-in emails for now. Wait a while, then try again.' : `Could not send the link. ${errText(err)}`;
    }
    this.codeSent = { email: e.toLowerCase(), at: this.d.now() };
    this.emit({ linkSentTo: e, message: null });
    return null;
  }

  /**
   * Signs in with the one-time code from the sign-in email, keeping the session as the
   * link's redirect does, then runs the first round. Resolves to an error message for the
   * form, or null when signed in.
   */
  async signInWithCode(email: string, code: string): Promise<string | null> {
    const e = email.trim();
    if (!EMAIL_RE.test(e)) return 'Enter the email address the code was sent to.';
    const c = cleanCode(code);
    if (c === null) return 'Enter the 6-digit code from the email.';
    let session: Session;
    try {
      session = await verifyCode(this.d.config, this.d.fetch, e, c, this.d.now());
    } catch (err) {
      return this.codeProblem(err, e);
    }
    await this.adopt(session, e);
    return null;
  }

  /** Keeps a new session as the link's redirect does, then runs the first round. */
  private async adopt(session: Session, email: string): Promise<void> {
    this.codeSent = null;
    this.state.session = session;
    await this.persist();
    this.emit({ phase: 'idle', email: session.email ?? email, message: null, linkSentTo: null, remoteErrors: [] });
    await this.syncNow();
  }

  /**
   * Signs in with email and password, keeping the session as the other ways in do, then
   * runs the first round. Resolves to an error message for the form, or null when signed in.
   */
  async signInWithPassword(email: string, password: string): Promise<string | null> {
    const e = email.trim();
    if (!EMAIL_RE.test(e)) return 'Enter an email address.';
    if (password === '') return 'Enter your password.';
    if (this.d.isOnline?.() === false) return OFFLINE_TEXT;
    let session: Session;
    try {
      session = await signInWithPassword(this.d.config, this.d.fetch, e, password, this.d.now());
    } catch (err) {
      if (!(err instanceof SyncHttpError)) return `Could not sign in. ${errText(err)}`;
      if (err.status === 0) return OFFLINE_TEXT;
      if (err.status === 429) return 'Too many sign-in attempts for now. Wait a few minutes, then try again.';
      if (err.code === 'email_not_confirmed') return 'This email address is not confirmed yet. Sign in with the emailed link or code instead.';
      if (err.status === 400 && (err.code === null || err.code === 'invalid_credentials' || err.code === 'invalid_grant')) {
        return 'Wrong email or password. Check both, or sign in with an emailed link or code and set a password there.';
      }
      return `Could not sign in. ${errText(err)}`;
    }
    await this.adopt(session, e);
    return null;
  }

  /**
   * Sets a password for the signed-in account, so another device (the Home Screen app) can
   * sign in with it. Resolves to an error message for the form, or null when set.
   */
  async setPassword(password: string): Promise<string | null> {
    if (this.state.session === null) return 'Sign in first, then set a password.';
    if (password.length < MIN_PASSWORD_CHARS) return `Use at least ${MIN_PASSWORD_CHARS} characters.`;
    if (this.d.isOnline?.() === false) return OFFLINE_TEXT;
    try {
      await this.authed((s) => updatePassword(this.d.config, this.d.fetch, s.accessToken, password));
    } catch (err) {
      if (err instanceof SessionExpired) {
        await this.failed(err);
        return 'Your sign-in has expired. Sign in again, then set the password.';
      }
      if (!(err instanceof SyncHttpError)) return `Could not set the password. ${errText(err)}`;
      if (err.status === 0) return OFFLINE_TEXT;
      if (err.status === 429) return 'Too many tries for now. Wait a few minutes, then try again.';
      if (err.code === 'reauthentication_needed' || /reauthenticat/i.test(err.detail ?? '')) {
        return 'Supabase wants a fresh sign-in first: sign out, sign in again, and set the password straight away, or turn off "Secure password change" in Supabase Auth settings.';
      }
      if (err.code === 'same_password') return 'That is already the password for this account.';
      if (err.status === 422 || err.code === 'weak_password') {
        return `That password is too weak${err.detail === null ? '' : ` (${err.detail.replace(/\.$/, '')})`}. Try a longer one.`;
      }
      return `Could not set the password. ${errText(err)}`;
    }
    return null;
  }

  /** Words for a refused code. GoTrue answers a wrong code and an expired one alike, so the time since sending decides. */
  private codeProblem(err: unknown, email: string): string {
    if (err instanceof SyncHttpError && err.status === 429) return 'Too many tries for now. Wait a few minutes, then try again.';
    const refused = err instanceof SyncHttpError && (err.code === 'otp_expired' || err.status === 403);
    if (!refused) return `Could not sign in with the code. ${errText(err)}`;
    const sent = this.codeSent?.email === email.toLowerCase() ? this.codeSent.at : null;
    if (sent !== null && this.d.now() - sent >= CODE_TTL_MS) return 'That code has expired. Send a new email and use the new code.';
    if (sent !== null) return 'That code is not right. Check it against the newest email: each new email replaces the code before it.';
    return 'That code is wrong or has expired. Check it against the newest email, or send a new one.';
  }

  /** Signs this device out. Local progress stays. */
  async signOut(): Promise<void> {
    const s = this.state.session;
    this.state = { session: null, pending: false, lastSyncedAt: null };
    if (this.timer !== null) this.d.timers.clear(this.timer);
    this.timer = null;
    await this.persist();
    this.emit({ phase: 'signed-out', email: null, message: null, remoteErrors: [], linkSentTo: null });
    if (s !== null) {
      // Best effort: the local session is gone either way.
      try {
        await logout(this.d.config, this.d.fetch, s.accessToken);
      } catch {
        // Offline or already expired.
      }
    }
  }

  /** The learner changed the document: mark it pending and sync shortly. */
  localChanged(): void {
    this.changes++;
    if (!this.state.pending) {
      this.state.pending = true;
      void this.persist();
    }
    if (this.state.session === null) return;
    this.emit({});
    this.schedule(DEBOUNCE_MS);
  }

  /** The browser is back online. */
  online(): void {
    if (this.state.session !== null && (this.state.pending || this.status.phase === 'error')) {
      this.failures = 0;
      this.schedule(0);
    }
  }

  private schedule(ms: number): void {
    if (this.stopped) return;
    if (this.timer !== null) this.d.timers.clear(this.timer);
    this.timer = this.d.timers.set(() => {
      this.timer = null;
      void this.syncNow();
    }, ms);
  }

  /** Runs a round now; a call during a round runs one more after it. Never rejects. */
  syncNow(): Promise<void> {
    if (this.timer !== null) {
      this.d.timers.clear(this.timer);
      this.timer = null;
    }
    if (this.running !== null) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.round();
        } while (this.again && !this.stopped && this.state.session !== null);
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  private async fresh(force: boolean): Promise<Session> {
    const s = this.state.session;
    if (s === null) throw new Error('not signed in');
    if (!force && s.expiresAt - REFRESH_EARLY_MS > this.d.now()) return s;
    let next: Session;
    try {
      next = await refreshSession(this.d.config, this.d.fetch, s.refreshToken, this.d.now());
    } catch (e) {
      if (e instanceof SyncHttpError && !e.retry) throw new SessionExpired(e.message);
      throw e;
    }
    this.state.session = next;
    await this.persist();
    return next;
  }

  /** Runs `f` with a valid access token, renewing it once if the server says it expired. */
  private async authed<T>(f: (s: Session) => Promise<T>): Promise<T> {
    try {
      return await f(await this.fresh(false));
    } catch (e) {
      // GoTrue's /user answers an expired token with 403 `bad_jwt`; PostgREST with 401.
      if (e instanceof SyncHttpError && (e.status === 401 || e.code === 'bad_jwt')) return f(await this.fresh(true));
      throw e;
    }
  }

  private async round(): Promise<void> {
    if (this.stopped || this.state.session === null) return;
    if (this.d.isOnline?.() === false) {
      this.emit({ phase: 'idle', message: 'Offline. Changes will sync when the connection is back.' });
      return;
    }
    const changesAtStart = this.changes;
    this.emit({ phase: 'syncing', message: null });
    try {
      const row = await this.authed((s) => pullRow(this.d.config, this.d.fetch, s));
      let remote: Progress | null = null;
      /** The row's envelope as found, and parsed; both absent when the row has none. */
      let remoteRaw: unknown = undefined;
      let remoteLearner: LearnerState | null = null;
      if (row !== null) {
        const { progress: doc, learner } = splitDoc(row.doc);
        const r = importProgress(doc, { knownTopicIds: this.d.knownTopicIds });
        const l = learner === undefined ? null : parseLearner(learner);
        const errors = [...(r.ok ? [] : r.errors), ...(l !== null && !l.ok ? [l.error] : [])];
        if (!r.ok || (l !== null && !l.ok)) {
          this.emit({
            phase: 'error', remoteErrors: errors,
            message: 'The synced copy could not be read, so it was not merged and nothing was sent. Progress on this device is safe.',
          });
          return;
        }
        remote = r.value;
        remoteRaw = learner;
        remoteLearner = l?.ok === true ? l.value : null;
      }

      const local = this.d.getLocal();
      let merged = local === null ? remote : remote === null ? local : this.d.normalize(mergeProgress(local, remote));
      if (merged !== null && local === null) merged = this.d.normalize(merged);
      if (merged !== null) {
        // The learner may have changed something while the pull was in flight: merge that in too.
        const current = this.d.getLocal();
        if (current !== null && current !== local) merged = this.d.normalize(mergeProgress(current, merged));
        if (current === null || !sameProgress(current, merged)) await this.d.apply(merged);
      }

      // The envelope: merged with the row's and saved here, or carried through untouched.
      let learnerOut: unknown = remoteRaw;
      let learnerNews = false;
      if (this.d.learner !== undefined) {
        const mine = this.d.learner.get();
        const mergedL = remoteLearner === null ? mine : mergeLearner(mine, remoteLearner);
        if (!sameLearner(mergedL, mine)) this.d.learner.apply(mergedL);
        learnerOut = mergedL;
        learnerNews = remoteLearner === null ? !isEmptyLearner(mergedL) : !sameLearner(mergedL, remoteLearner);
      }

      if (merged !== null && (remote === null || !sameProgress(merged, remote) || learnerNews)) {
        const text = JSON.stringify(joinDoc(merged, learnerOut));
        if (text.length > MAX_SYNC_CHARS) {
          this.emit({ phase: 'error', message: `Progress is too large to sync (${text.length} characters). Export a file instead.`, remoteErrors: [] });
          return;
        }
        await this.authed((s) => pushRow(this.d.config, this.d.fetch, s, text, PROGRESS_VERSION));
      }

      this.failures = 0;
      if (this.changes === changesAtStart) this.state.pending = false;
      this.state.lastSyncedAt = this.d.now();
      await this.persist();
      this.emit({ phase: 'idle', message: null, remoteErrors: [] });
    } catch (e) {
      await this.failed(e);
    }
  }

  private async failed(e: unknown): Promise<void> {
    if (e instanceof SessionExpired) {
      this.state.session = null;
      await this.persist();
      this.emit({ phase: 'signed-out', email: null, message: 'Your sign-in has expired. Sign in again to keep syncing.' });
      return;
    }
    if (e instanceof SyncHttpError && e.retry) {
      const delay = Math.min(RETRY_BASE_MS * 2 ** this.failures, RETRY_MAX_MS);
      this.failures++;
      this.emit({ phase: 'error', message: `${errText(e)}. Trying again in ${Math.round(delay / 1000)} seconds.`, remoteErrors: [] });
      this.schedule(delay);
      return;
    }
    // A problem retrying will not fix (a missing table, a refused write): say so and wait for the next change or Sync now.
    const hint = e instanceof SyncHttpError && (e.status === 404 || e.code === 'PGRST205' || e.code === '42P01')
      ? ' The learnhub_progress table may be missing: see SYNC-SETUP.md.' : '';
    this.emit({ phase: 'error', message: `${errText(e)}.${hint}`, remoteErrors: [] });
  }
}
