import { describe, expect, it } from 'vitest';
import {
  MemoryStorage, PROGRESS_VERSION, exportProgress, importProgress, mergeProgress, sameProgress, withChoices,
  type HistoryEntry, type Progress, type SupervisionResult,
} from '@learnhub/mastery';
import { newCampaign } from '@/model/campaign';
import { DEFAULT_COURSES, finishOpenPlacement, startLearner, withoutSelfReport } from '@/model/learner';
import { KNOWN_IDS } from '@/model/store';
import { parseSyncConfig } from './config';
import {
  CODE_TTL_MS, DEBOUNCE_MS, MAX_SYNC_CHARS, RETRY_BASE_MS, SYNC_STATE_KEY, SyncEngine, type SyncStatus,
} from './engine';
import { ANON_KEY, FakeSupabase, URL_BASE } from './fakeSupabase';
import { readAuthFragment } from './supabase';
import { LEARNER_VERSION, emptyLearner, learnerValues, observeLearner, type LearnerState, type LearnerValues } from './learner/envelope';
import { plain } from './learner/join';

const T0 = new Date(2026, 9, 5, 9, 0).getTime();
const EMAIL = 'albert@example.com';
const PAGE = 'https://clz4096.github.io/learnhub/sims/mastery/';

/** A clock and a timer queue the test moves by hand. */
class Clock {
  t = T0;
  private timers: { at: number; f: () => void; id: number }[] = [];
  private next = 0;
  readonly now = (): number => this.t;
  readonly timerApi = {
    set: (f: () => void, ms: number): unknown => {
      const id = ++this.next;
      this.timers.push({ at: this.t + ms, f, id });
      return id;
    },
    clear: (h: unknown): void => { this.timers = this.timers.filter((x) => x.id !== h); },
  };

  pendingDelays(): number[] {
    return this.timers.map((x) => x.at - this.t);
  }

  /** Moves time forward, firing due timers in order, and lets their rounds finish. */
  async advance(ms: number): Promise<void> {
    const end = this.t + ms;
    for (;;) {
      this.timers.sort((a, b) => a.at - b.at);
      const first = this.timers[0];
      if (first === undefined || first.at > end) break;
      this.timers.shift();
      this.t = Math.max(this.t, first.at);
      first.f();
      await settle();
    }
    this.t = end;
  }
}

/** Lets every pending promise chain run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 50; i++) await new Promise((r) => setTimeout(r, 0));
}

const normalize = (p: Progress): Progress => withoutSelfReport(finishOpenPlacement(p, T0)).progress;

/** One device: its own local document, its own storage for the session, its own engine. */
class Device {
  doc: Progress | null;
  readonly storage = new MemoryStorage();
  readonly statuses: SyncStatus[] = [];
  online = true;
  engine: SyncEngine;
  applied = 0;

  constructor(readonly server: FakeSupabase, readonly clock: Clock, doc: Progress | null) {
    this.doc = doc;
    this.engine = this.makeEngine();
  }

  makeEngine(extra: Partial<ConstructorParameters<typeof SyncEngine>[0]> = {}): SyncEngine {
    const { config } = parseSyncConfig({ url: URL_BASE, anonKey: ANON_KEY });
    if (config === null) throw new Error('test config refused');
    return new SyncEngine({
      config,
      fetch: (url, init) => (this.online ? this.server.fetch(url, init) : Promise.reject(new TypeError('Failed to fetch'))),
      storage: this.storage,
      now: this.clock.now,
      timers: this.clock.timerApi,
      getLocal: () => this.doc,
      apply: async (p) => { this.doc = p; this.applied++; },
      normalize,
      knownTopicIds: KNOWN_IDS,
      redirectTo: PAGE,
      onStatus: (s) => { this.statuses.push(s); },
      ...extra,
    });
  }

  get status(): SyncStatus {
    return this.engine.getStatus();
  }

  /** The learner changes something here, as `commit` would report it. */
  change(f: (p: Progress) => Progress): void {
    this.doc = f(this.doc as Progress);
    this.engine.localChanged();
  }

  async signInByLink(): Promise<void> {
    await this.engine.start(readAuthFragment(this.server.magicLinkFragment(EMAIL), this.clock.now()));
    await settle();
  }
}

function lesson(topicId: string, at: number): (p: Progress) => Progress {
  const h: HistoryEntry = { at, kind: 'lesson', topicId, correct: true };
  return (p) => ({ ...p, history: [...p.history, h], updatedAt: at });
}

const started = (at = T0): Progress => startLearner(at, DEFAULT_COURSES, 60);
const pushes = (s: FakeSupabase): number => s.calls.filter((c) => c.method === 'POST' && c.path === '/rest/v1/learnhub_progress').length;

function setup(): { clock: Clock; server: FakeSupabase } {
  const clock = new Clock();
  return { clock, server: new FakeSupabase(clock.now) };
}

describe('sign in by email link', () => {
  it('sends the link to this page, then signs in from the redirect and keeps the session for next time', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.engine.start(null);
    expect(mac.status.phase).toBe('signed-out');
    expect(server.calls).toEqual([]);

    expect(await mac.engine.signIn('not an email')).toMatch(/Enter an email/);
    expect(await mac.engine.signIn(` ${EMAIL} `)).toBeNull();
    expect(server.emails).toEqual([{ email: EMAIL, redirectTo: PAGE }]);
    expect(mac.status.linkSentTo).toBe(EMAIL);
    const otp = server.calls[0];
    expect(otp?.headers.apikey).toBe(ANON_KEY);
    expect(otp?.headers.authorization).toBeUndefined();
    expect(JSON.parse(otp?.body ?? '{}')).toEqual({ email: EMAIL, create_user: true });

    await mac.signInByLink();
    expect(mac.status).toMatchObject({ phase: 'idle', email: EMAIL, pending: false, lastSyncedAt: T0, message: null });
    // The first round found no row and pushed this device's document.
    expect(sameProgress(server.rows.get(server.userId(EMAIL))?.doc as Progress, mac.doc as Progress)).toBe(true);

    // A reload: a new engine on the same storage is signed in without a link.
    mac.engine.stop();
    mac.engine = mac.makeEngine();
    await mac.engine.start(null);
    expect(mac.status).toMatchObject({ phase: 'idle', email: EMAIL });
    const saved = JSON.parse((await mac.storage.get(SYNC_STATE_KEY)) ?? '{}');
    expect(saved.session.userId).toBe(server.userId(EMAIL));
  });

  it('reports a failed or expired link from the redirect, and stays signed out', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    const r = readAuthFragment('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', T0);
    await mac.engine.start(r);
    expect(mac.status).toMatchObject({ phase: 'signed-out', message: 'Sign-in failed: Email link is invalid or has expired' });
    expect(server.calls).toEqual([]);
  });

  it('an ordinary route in the fragment is not a sign-in', () => {
    expect(readAuthFragment('#/progress', T0)).toBeNull();
    expect(readAuthFragment('', T0)).toBeNull();
    expect(readAuthFragment('#access_token=garbage&refresh_token=x', T0)).toEqual({ kind: 'error', message: 'Sign-in failed: the link did not carry a usable session' });
  });

  it('too many emails: says to wait', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.engine.start(null);
    server.failures.push(429);
    expect(await mac.engine.signIn(EMAIL)).toMatch(/Too many sign-in emails/);
  });

  it('sign out ends only this device\'s session and keeps local progress', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.signInByLink();
    const doc = mac.doc;
    await mac.engine.signOut();
    expect(mac.status.phase).toBe('signed-out');
    expect(mac.doc).toBe(doc);
    const out = server.calls.find((c) => c.path === '/auth/v1/logout');
    expect(out?.query.get('scope')).toBe('local');
    expect(JSON.parse((await mac.storage.get(SYNC_STATE_KEY)) ?? '{}').session).toBeNull();
    mac.change(lesson('pre.fractions', T0 + 5));
    await clock.advance(DEBOUNCE_MS * 2);
    expect(server.calls.filter((c) => c.path.startsWith('/rest/'))).toHaveLength(2);
  });
});

describe('sign in by emailed code', () => {
  const verifies = (s: FakeSupabase) => s.calls.filter((c) => c.path === '/auth/v1/verify');

  it('the code from the same email signs in, keeps the session as the link does, and works once', async () => {
    const { clock, server } = setup();
    const phone = new Device(server, clock, started());
    await phone.engine.start(null);
    expect(await phone.engine.signIn(EMAIL)).toBeNull();
    const code = server.lastCode(EMAIL) ?? '';
    expect(code).toMatch(/^\d{6}$/);

    // Typed with a space, as the email may group it.
    expect(await phone.engine.signInWithCode(` ${EMAIL} `, `${code.slice(0, 3)} ${code.slice(3)}`)).toBeNull();
    const v = verifies(server)[0];
    expect(v?.method).toBe('POST');
    expect(v?.headers.apikey).toBe(ANON_KEY);
    expect(v?.headers.authorization).toBeUndefined();
    expect(JSON.parse(v?.body ?? '{}')).toEqual({ type: 'email', email: EMAIL, token: code });
    expect(phone.status).toMatchObject({ phase: 'idle', email: EMAIL, linkSentTo: null, message: null, lastSyncedAt: T0 });
    expect(sameProgress(server.rows.get(server.userId(EMAIL))?.doc as Progress, phone.doc as Progress)).toBe(true);

    phone.engine.stop();
    phone.engine = phone.makeEngine();
    await phone.engine.start(null);
    expect(phone.status).toMatchObject({ phase: 'idle', email: EMAIL });
    expect(JSON.parse((await phone.storage.get(SYNC_STATE_KEY)) ?? '{}').session.userId).toBe(server.userId(EMAIL));

    // Spent: the same code is refused on another device.
    const other = new Device(server, clock, started());
    await other.engine.start(null);
    expect(await other.engine.signInWithCode(EMAIL, code)).toMatch(/wrong or has expired/);
  });

  it('checks the form before asking the server', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.engine.start(null);
    expect(await mac.engine.signInWithCode('', '123456')).toBe('Enter the email address the code was sent to.');
    expect(await mac.engine.signInWithCode(EMAIL, '12345')).toBe('Enter the 6-digit code from the email.');
    expect(await mac.engine.signInWithCode(EMAIL, 'abcdef')).toBe('Enter the 6-digit code from the email.');
    expect(server.calls).toEqual([]);
  });

  it('a wrong code, an expired one, and a replaced one each get plain words, and stay signed out', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.engine.start(null);
    await mac.engine.signIn(EMAIL);
    const first = server.lastCode(EMAIL) ?? '';
    const wrong = first === '000000' ? '111111' : '000000';
    expect(await mac.engine.signInWithCode(EMAIL, wrong)).toBe(
      'That code is not right. Check it against the newest email: each new email replaces the code before it.');
    expect(mac.status.phase).toBe('signed-out');

    // A second email replaces the first code.
    await mac.engine.signIn(EMAIL);
    expect(server.lastCode(EMAIL)).not.toBe(first);
    expect(await mac.engine.signInWithCode(EMAIL, first)).toMatch(/^That code is not right/);

    clock.t += CODE_TTL_MS;
    expect(await mac.engine.signInWithCode(EMAIL, server.lastCode(EMAIL) ?? '')).toBe('That code has expired. Send a new email and use the new code.');
    expect(mac.status.phase).toBe('signed-out');
    expect(JSON.parse((await mac.storage.get(SYNC_STATE_KEY)) ?? '{"session":null}').session).toBeNull();

    // After a reload this engine never sent the email, so it cannot say which.
    mac.engine = mac.makeEngine();
    await mac.engine.start(null);
    expect(await mac.engine.signInWithCode(EMAIL, '123456')).toBe('That code is wrong or has expired. Check it against the newest email, or send a new one.');
  });

  it('too many tries, and no connection', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.engine.start(null);
    await mac.engine.signIn(EMAIL);
    server.failures.push(429);
    expect(await mac.engine.signInWithCode(EMAIL, server.lastCode(EMAIL) ?? '')).toBe('Too many tries for now. Wait a few minutes, then try again.');
    mac.online = false;
    expect(await mac.engine.signInWithCode(EMAIL, server.lastCode(EMAIL) ?? '')).toMatch(/^Could not sign in with the code\. checking the code: no connection/);
    mac.online = true;
    expect(await mac.engine.signInWithCode(EMAIL, server.lastCode(EMAIL) ?? '')).toBeNull();
    expect(mac.status.phase).toBe('idle');
  });
});

describe('pull, merge, push', () => {
  it('a second device pulls the first one\'s progress, merges its own in, and pushes the result', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    mac.doc = lesson('pre.fractions', T0 + 1)(mac.doc as Progress);
    await mac.signInByLink();

    // The phone studied before signing in.
    const phone = new Device(server, clock, lesson('pre.indices', T0 + 2)(started(T0 + 2)));
    await phone.signInByLink();
    const topics = (p: Progress | null): string[] => (p?.history ?? []).map((h) => h.topicId).sort();
    expect(topics(phone.doc)).toEqual(['pre.fractions', 'pre.indices']);
    expect(topics(server.rows.get(server.userId(EMAIL))?.doc as Progress)).toEqual(['pre.fractions', 'pre.indices']);

    await mac.engine.syncNow();
    expect(sameProgress(mac.doc as Progress, phone.doc as Progress)).toBe(true);
  });

  it('a new device with nothing yet takes the synced copy as is', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, lesson('pre.fractions', T0 + 1)(started()));
    await mac.signInByLink();
    const phone = new Device(server, clock, null);
    const before = pushes(server);
    await phone.signInByLink();
    expect(sameProgress(phone.doc as Progress, mac.doc as Progress)).toBe(true);
    // Nothing new to send.
    expect(pushes(server)).toBe(before);
  });

  it('pushes a moment after each change, one round for a burst of changes', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.signInByLink();
    const before = pushes(server);
    mac.change(lesson('pre.fractions', T0 + 10));
    mac.change(lesson('pre.indices', T0 + 11));
    expect(mac.status.pending).toBe(true);
    await clock.advance(DEBOUNCE_MS - 1);
    expect(pushes(server)).toBe(before);
    await clock.advance(1);
    expect(pushes(server)).toBe(before + 1);
    expect((server.rows.get(server.userId(EMAIL))?.doc as Progress).history).toHaveLength(2);
    expect(mac.status.pending).toBe(false);
  });

  it('a supervision result imported on one device reaches the other and survives its offline work', async () => {
    const { clock, server } = setup();
    const copy = { problem: 'pre.fractions/q1', nonce: 'ABCDEFGH', writeUp: 'x', copiedAt: T0, result: null, importedAt: null };
    const base = { ...started(), supervision: [copy] };
    const mac = new Device(server, clock, base);
    await mac.signInByLink();
    const phone = new Device(server, clock, null);
    await phone.signInByLink();

    phone.online = false;
    phone.change(lesson('pre.indices', T0 + 20));
    const r: SupervisionResult = { mark: 16, weakPoints: ['a', 'b', 'c'], redo: [], summary: 'Good.' };
    mac.change((p) => ({ ...p, supervision: [{ ...copy, result: r, importedAt: T0 + 30 }], updatedAt: T0 + 30 }));
    await clock.advance(DEBOUNCE_MS);
    phone.online = true;
    phone.engine.online();
    await clock.advance(0);
    expect(phone.doc?.supervision[0]?.result).toEqual(r);
    expect((server.rows.get(server.userId(EMAIL))?.doc as Progress).supervision[0]?.result).toEqual(r);
  });
});

describe('offline and errors', () => {
  it('queues changes while offline, backs off, and sends them when the connection returns', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.signInByLink();
    mac.online = false;
    mac.change(lesson('pre.fractions', T0 + 10));
    await clock.advance(DEBOUNCE_MS);
    expect(mac.status.phase).toBe('error');
    expect(mac.status.message).toMatch(/no connection.*Trying again in 2 seconds/);
    expect(clock.pendingDelays()).toEqual([RETRY_BASE_MS]);
    await clock.advance(RETRY_BASE_MS);
    expect(clock.pendingDelays()).toEqual([RETRY_BASE_MS * 2]);
    // The flag survives a reload.
    expect(JSON.parse((await mac.storage.get(SYNC_STATE_KEY)) ?? '{}').pending).toBe(true);

    mac.online = true;
    mac.engine.online();
    await clock.advance(0);
    expect(mac.status).toMatchObject({ phase: 'idle', pending: false, message: null });
    expect((server.rows.get(server.userId(EMAIL))?.doc as Progress).history).toHaveLength(1);
    expect(clock.pendingDelays()).toEqual([]);
  });

  it('backoff is capped at five minutes', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.signInByLink();
    mac.online = false;
    await mac.engine.syncNow();
    for (let i = 0; i < 12; i++) await clock.advance(clock.pendingDelays()[0] ?? 0);
    expect(clock.pendingDelays()).toEqual([5 * 60_000]);
  });

  it('a server error is retried; a refused write is reported and not retried', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.signInByLink();
    server.failures.push(503);
    mac.change(lesson('pre.fractions', T0 + 10));
    await clock.advance(DEBOUNCE_MS);
    expect(mac.status.message).toMatch(/fake failure 503/);
    await clock.advance(RETRY_BASE_MS);
    expect(mac.status.phase).toBe('idle');

    server.failures.push(404);
    mac.change(lesson('pre.indices', T0 + 11));
    await clock.advance(DEBOUNCE_MS);
    expect(mac.status.message).toMatch(/learnhub_progress table may be missing/);
    expect(clock.pendingDelays()).toEqual([]);
  });

  it('when the browser says it is offline, a round waits without a request', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.signInByLink();
    const n = server.calls.length;
    const offline = mac.makeEngine({ isOnline: () => false });
    await offline.start(null);
    expect(server.calls.length).toBe(n);
    expect(offline.getStatus().message).toMatch(/Offline/);
  });

  it('refuses to push a document over the size limit', async () => {
    const { clock, server } = setup();
    const huge = { ...started(), supervision: Array.from({ length: 80 }, (_, i) => ({
      problem: 'pre.fractions/q1', nonce: `ABCDEF${'ABCDEFGHJKMNPQRSTVWXYZ23456789'[Math.floor(i / 30)]}${'ABCDEFGHJKMNPQRSTVWXYZ23456789'[i % 30]}`,
      writeUp: 'x'.repeat(20_000), copiedAt: T0 + i, result: null, importedAt: null,
    })) };
    expect(JSON.stringify(huge).length).toBeGreaterThan(MAX_SYNC_CHARS);
    const mac = new Device(server, clock, huge);
    await mac.signInByLink();
    expect(mac.status.message).toMatch(/too large to sync/);
    expect(pushes(server)).toBe(0);
  });
});

describe('tokens', () => {
  it('renews an access token that is about to expire before using it', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.signInByLink();
    clock.t += 3600_000;
    mac.change(lesson('pre.fractions', clock.t));
    await clock.advance(DEBOUNCE_MS);
    expect(server.calls.filter((c) => c.path === '/auth/v1/token')).toHaveLength(1);
    expect(mac.status.phase).toBe('idle');
  });

  it('renews once and retries when the server says the token expired', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.signInByLink();
    server.expireAccessTokens();
    await mac.engine.syncNow();
    expect(server.calls.filter((c) => c.path === '/auth/v1/token')).toHaveLength(1);
    expect(mac.status.phase).toBe('idle');
  });

  it('a revoked refresh token signs the device out and says so', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.signInByLink();
    server.expireAccessTokens();
    server.revokeRefreshTokens();
    await mac.engine.syncNow();
    expect(mac.status).toMatchObject({ phase: 'signed-out', message: 'Your sign-in has expired. Sign in again to keep syncing.' });
  });
});

describe('two devices in conflict', () => {
  it('both study offline, then sync in turn: both end with all the work and the same document', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.signInByLink();
    const phone = new Device(server, clock, null);
    await phone.signInByLink();

    mac.online = false;
    phone.online = false;
    mac.change(lesson('pre.fractions', T0 + 100));
    mac.change((p) => withChoices(p, { budgetMinutes: 90 }, T0 + 101));
    phone.change(lesson('pre.indices', T0 + 200));
    phone.change((p) => withChoices(p, { courseWeights: { 'ia-probability': 2 } }, T0 + 201));
    await clock.advance(DEBOUNCE_MS);

    mac.online = true;
    phone.online = true;
    await mac.engine.syncNow();
    await phone.engine.syncNow();
    await mac.engine.syncNow();
    expect(sameProgress(mac.doc as Progress, phone.doc as Progress)).toBe(true);
    const row = server.rows.get(server.userId(EMAIL))?.doc as Progress;
    expect(sameProgress(row, mac.doc as Progress)).toBe(true);
    expect(row.history.map((h) => h.topicId)).toEqual(['pre.fractions', 'pre.indices']);
    expect(row.settings).toMatchObject({ budgetMinutes: 90, courseWeights: { 'ia-probability': 2 } });
  });

  it('a push that lands between another device\'s pull and push is not lost: the next round restores it', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.signInByLink();
    const phone = new Device(server, clock, null);
    await phone.signInByLink();

    mac.doc = lesson('pre.fractions', T0 + 100)(mac.doc as Progress);
    phone.doc = lesson('pre.indices', T0 + 200)(phone.doc as Progress);
    // The phone's whole round runs after the Mac has pulled and before it pushes.
    server.before = async (c) => {
      if (c.method === 'GET') server.before = async (d) => { if (d.method === 'POST') await phone.engine.syncNow(); };
    };
    await mac.engine.syncNow();
    // The Mac overwrote the phone's push; the phone still holds its work and sends it again.
    expect((server.rows.get(server.userId(EMAIL))?.doc as Progress).history.map((h) => h.topicId)).toEqual(['pre.fractions']);
    expect(phone.doc?.history.map((h) => h.topicId)).toEqual(['pre.indices']);
    await phone.engine.syncNow();
    await mac.engine.syncNow();
    const row = server.rows.get(server.userId(EMAIL))?.doc as Progress;
    expect(row.history.map((h) => h.topicId)).toEqual(['pre.fractions', 'pre.indices']);
    expect(sameProgress(mac.doc as Progress, phone.doc as Progress)).toBe(true);
  });

  it('a change made while a round is in flight is merged, not overwritten, and synced next', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    await mac.signInByLink();
    const phone = new Device(server, clock, null);
    await phone.signInByLink();
    phone.doc = lesson('pre.indices', T0 + 50)(phone.doc as Progress);
    await phone.engine.syncNow();

    server.before = async () => { mac.change(lesson('pre.fractions', T0 + 60)); };
    await mac.engine.syncNow();
    expect((mac.doc as Progress).history.map((h) => h.topicId)).toEqual(['pre.indices', 'pre.fractions']);
    expect(mac.status.pending).toBe(true);
    await clock.advance(DEBOUNCE_MS);
    expect(mac.status.pending).toBe(false);
    expect((server.rows.get(server.userId(EMAIL))?.doc as Progress).history).toHaveLength(2);
  });

  it('Start over on one device reaches the other', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, lesson('pre.fractions', T0 + 1)(started()));
    await mac.signInByLink();
    const phone = new Device(server, clock, null);
    await phone.signInByLink();
    const { resetProgress } = await import('@learnhub/mastery');
    phone.change(() => resetProgress('mastery', T0 + 500));
    await clock.advance(DEBOUNCE_MS);
    await mac.engine.syncNow();
    expect(mac.doc?.courses).toEqual([]);
    expect(mac.doc?.history).toEqual([]);
  });
});

describe('a malformed synced copy', () => {
  it('is reported, not merged, and nothing is pushed over it', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, lesson('pre.fractions', T0 + 1)(started()));
    const uid = server.userId(EMAIL);
    const bad = { version: 4, courseId: 'mastery', memory: 'oops' };
    server.rows.set(uid, { user_id: uid, doc: bad, version: 4, updated_at: '' });
    const before = exportProgress(mac.doc as Progress);
    await mac.signInByLink();
    expect(mac.status.phase).toBe('error');
    expect(mac.status.message).toMatch(/could not be read, so it was not merged/);
    expect(mac.status.remoteErrors.join('\n')).toMatch(/\$\.memory: expected an object/);
    expect(exportProgress(mac.doc as Progress)).toBe(before);
    expect(mac.applied).toBe(0);
    expect(pushes(server)).toBe(0);
    expect(server.rows.get(uid)?.doc).toEqual(bad);
  });

  it('a copy from a newer build is not overwritten either', async () => {
    const { clock, server } = setup();
    const mac = new Device(server, clock, started());
    const uid = server.userId(EMAIL);
    server.rows.set(uid, { user_id: uid, doc: { version: 99 }, version: 99, updated_at: '' });
    await mac.signInByLink();
    expect(mac.status.remoteErrors.join('\n')).toMatch(/newer build/);
    expect(pushes(server)).toBe(0);
  });

  it('a valid older-version copy is migrated, then merged', async () => {
    const { clock, server } = setup();
    const uid = server.userId(EMAIL);
    const old = JSON.parse(exportProgress(lesson('pre.indices', T0 - 10)(started(T0 - 20))));
    old.version = 3;
    delete old.changedAt;
    delete old.resetAt;
    server.rows.set(uid, { user_id: uid, doc: old, version: 3, updated_at: '' });
    const mac = new Device(server, clock, lesson('pre.fractions', T0 + 1)(started()));
    await mac.signInByLink();
    expect(mac.status.phase).toBe('idle');
    expect(mac.doc?.history.map((h) => h.topicId)).toEqual(['pre.indices', 'pre.fractions']);
    expect((server.rows.get(uid)?.doc as Progress).version).toBe(PROGRESS_VERSION);
  });
});

describe('config', () => {
  it('accepts an anon JWT or a publishable key, and refuses keys that bypass row-level security', () => {
    expect(parseSyncConfig({ url: `${URL_BASE}/`, anonKey: ANON_KEY })).toEqual({ config: { url: URL_BASE, anonKey: ANON_KEY }, error: null });
    expect(parseSyncConfig({ url: URL_BASE, anonKey: 'sb_publishable_abc' }).config).not.toBeNull();
    expect(parseSyncConfig({ url: URL_BASE, anonKey: 'sb_secret_abc' }).error).toMatch(/secret key/);
    const service = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.x';
    expect(parseSyncConfig({ url: URL_BASE, anonKey: service }).error).toMatch(/role "service_role"/);
    expect(parseSyncConfig({ url: URL_BASE, anonKey: 'hello' }).error).toMatch(/not a Supabase anon key/);
  });

  it('refuses plain http except locally, and odd shapes', () => {
    expect(parseSyncConfig({ url: 'http://testref.supabase.co', anonKey: ANON_KEY }).config).toBeNull();
    expect(parseSyncConfig({ url: 'http://127.0.0.1:54321', anonKey: ANON_KEY }).config?.url).toBe('http://127.0.0.1:54321');
    expect(parseSyncConfig({ url: `${URL_BASE}?x=1`, anonKey: ANON_KEY }).config).toBeNull();
    expect(parseSyncConfig({ url: URL_BASE, anonKey: ANON_KEY, serviceKey: 'x' }).error).toMatch(/unknown fields: serviceKey/);
    expect(parseSyncConfig([1]).error).toMatch(/must hold an object/);
  });

  it('no config is off, with no error', () => {
    expect(parseSyncConfig(undefined)).toEqual({ config: null, error: null });
  });
});

describe('merge as the engine uses it', () => {
  it('is the package merge plus the app\'s load-time fix-ups', () => {
    const a = lesson('pre.fractions', T0 + 1)(started());
    const b = lesson('pre.indices', T0 + 2)(started());
    expect(sameProgress(normalize(mergeProgress(a, b)), normalize(mergeProgress(b, a)))).toBe(true);
  });
});

describe('the learner envelope (campaign, story, day log, ladder, mixed review, flags)', () => {
  /** A device whose learner envelope syncs: `learner` stands in for the stores and sync/local.ts. */
  class LearnerDevice extends Device {
    learner: LearnerState = emptyLearner();
    learnerApplied = 0;

    constructor(server: FakeSupabase, clock: Clock, doc: Progress | null) {
      super(server, clock, doc);
      this.engine = this.makeEngine({
        learner: {
          get: () => this.learner,
          apply: (l) => { this.learner = l; this.learnerApplied++; },
        },
      });
    }

    /** The learner changes a store here, as a save reports it. */
    act(f: (v: LearnerValues) => void): void {
      const v = plain(learnerValues(this.learner));
      f(v);
      this.learner = observeLearner(this.learner, v, this.clock.now());
      this.engine.localChanged();
    }

    get values(): LearnerValues {
      return learnerValues(this.learner);
    }
  }

  const rowDoc = (server: FakeSupabase): Record<string, unknown> => server.rows.get(server.userId(EMAIL))?.doc as Record<string, unknown>;

  it('a campaign begun on the Mac and a day ticked on the phone reach both, in the same row as progress', async () => {
    const { clock, server } = setup();
    const mac = new LearnerDevice(server, clock, started());
    mac.act((v) => { v.campaign = newCampaign('maths', T0); });
    await mac.signInByLink();
    expect((rowDoc(server).learner as LearnerState).campaign.value?.route).toBe('maths');
    expect(importProgress(rowDoc(server), { knownTopicIds: KNOWN_IDS }).ok).toBe(true);

    const phone = new LearnerDevice(server, clock, started());
    phone.act((v) => { v.day = { '2026-10-05': { wake: '07:00', ticks: [480] } }; });
    await phone.signInByLink();
    expect(phone.values.campaign?.route).toBe('maths');

    await mac.engine.syncNow();
    expect(mac.values.day['2026-10-05']?.ticks).toEqual([480]);
    expect(mac.learner).toEqual(phone.learner);
  });

  it('a change to the envelope alone is pushed, a moment after it', async () => {
    const { clock, server } = setup();
    const mac = new LearnerDevice(server, clock, started());
    await mac.signInByLink();
    const before = pushes(server);
    mac.act((v) => { v.flags = { 'p@1': ['Q2'] }; });
    await clock.advance(DEBOUNCE_MS);
    expect(pushes(server)).toBe(before + 1);
    expect((rowDoc(server).learner as LearnerState).flags.id).toBe('p@1');
  });

  it('an old row without an envelope is merged as progress, and the envelope is added on the next push', async () => {
    const { clock, server } = setup();
    const uid = server.userId(EMAIL);
    server.rows.set(uid, { user_id: uid, doc: JSON.parse(exportProgress(lesson('pre.indices', T0 - 10)(started(T0 - 20)))), version: PROGRESS_VERSION, updated_at: '' });
    const mac = new LearnerDevice(server, clock, started());
    mac.act((v) => { v.campaign = newCampaign('cs', T0); });
    await mac.signInByLink();
    expect(mac.status.phase).toBe('idle');
    expect(mac.doc?.history.map((h) => h.topicId)).toEqual(['pre.indices']);
    expect((rowDoc(server).learner as LearnerState).campaign.value?.route).toBe('cs');
  });

  it('an old build\'s push drops the envelope from the row; the next round of a new build puts it back', async () => {
    const { clock, server } = setup();
    const mac = new LearnerDevice(server, clock, started());
    mac.act((v) => { v.campaign = newCampaign('maths', T0); });
    await mac.signInByLink();
    // An old build replaces the row with progress only.
    const uid = server.userId(EMAIL);
    server.rows.set(uid, { user_id: uid, doc: JSON.parse(exportProgress(lesson('pre.sequences', T0 + 5)(started()))), version: PROGRESS_VERSION, updated_at: '' });
    await mac.engine.syncNow();
    expect((rowDoc(server).learner as LearnerState).campaign.value?.route).toBe('maths');
    expect(mac.values.campaign?.route).toBe('maths');
  });

  it('a build without the envelope wired carries the row\'s envelope through its push untouched', async () => {
    const { clock, server } = setup();
    const mac = new LearnerDevice(server, clock, started());
    mac.act((v) => { v.campaign = newCampaign('maths', T0); });
    await mac.signInByLink();
    const env = rowDoc(server).learner;
    const plainDevice = new Device(server, clock, lesson('pre.fractions', T0 + 3)(started()));
    await plainDevice.signInByLink();
    expect(pushes(server)).toBeGreaterThan(1);
    expect(rowDoc(server).learner).toEqual(env);
  });

  it('an envelope from a newer build is refused: nothing merged, nothing pushed', async () => {
    const { clock, server } = setup();
    const uid = server.userId(EMAIL);
    const doc = { ...JSON.parse(exportProgress(started())), learner: { ...emptyLearner(), version: LEARNER_VERSION + 1 } };
    server.rows.set(uid, { user_id: uid, doc, version: PROGRESS_VERSION, updated_at: '' });
    const mac = new LearnerDevice(server, clock, lesson('pre.fractions', T0 + 1)(started()));
    mac.act((v) => { v.campaign = newCampaign('cs', T0); });
    await mac.signInByLink();
    expect(mac.status.phase).toBe('error');
    expect(mac.status.remoteErrors.join('\n')).toMatch(/learner\.version: .*newer build/);
    expect(mac.learnerApplied).toBe(0);
    expect(mac.applied).toBe(0);
    expect(pushes(server)).toBe(0);
  });

  it('an old build reading a row with an envelope sees progress, with the envelope only a warning', () => {
    const doc = { ...JSON.parse(exportProgress(lesson('pre.fractions', T0)(started()))), learner: emptyLearner() };
    const r = importProgress(doc, { knownTopicIds: KNOWN_IDS });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings).toEqual(['$.learner: unknown field, ignored']);
      expect(r.value.history).toHaveLength(1);
    }
  });
});
