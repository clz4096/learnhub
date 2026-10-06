import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike, Progress } from '@learnhub/mastery';
import { DEFAULT_COURSES, startLearner } from '@/model/learner';
import { route } from '@/model/route';
import { commit, flush, init, loadState, progress, setClock } from '@/model/store';
import { parseSyncConfig } from '@/sync/config';
import { detectStandalone, standaloneApp, startSync, stopSync, syncSetup, syncStatus, takeAuthFragment } from '@/sync/app';
import { ANON_KEY, FakeSupabase, URL_BASE } from '@/sync/fakeSupabase';
import { readAuthFragment } from '@/sync/supabase';
import { STANDALONE_NOTE, SYNC_OFF_TEXT } from '@/ui/Sync';
import { ProgressView } from '@/ui/views/ProgressView';
import { Start } from '@/ui/views/Start';

const T0 = new Date(2026, 9, 5, 9, 0).getTime();
const EMAIL = 'albert@example.com';
const OFF = { config: null, error: null } as const;
const ON = parseSyncConfig({ url: URL_BASE, anonKey: ANON_KEY });

beforeEach(async () => {
  localStorage.clear();
  setClock(() => T0);
  // Whatever config the build carries, each test says which it wants.
  syncSetup.value = OFF;
  standaloneApp.value = false;
  syncStatus.value = { phase: 'signed-out', email: null, lastSyncedAt: null, pending: false, linkSentTo: null, message: null, remoteErrors: [] };
  await init(new IDBFactory() as unknown as IdbFactoryLike);
});
afterEach(() => {
  stopSync();
  cleanup();
  history.replaceState(null, '', '/');
});

describe('sync switched off (no config)', () => {
  it('the Progress page says only that sync is not set up', async () => {
    await commit(startLearner(T0, DEFAULT_COURSES, 60));
    render(<ProgressView />);
    const notes = [...document.querySelectorAll('[data-sync]')];
    expect(notes.map((n) => n.textContent)).toEqual([SYNC_OFF_TEXT]);
    expect(SYNC_OFF_TEXT).toBe('Sync between devices: not set up');
    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(screen.queryByRole('button', { name: /sign|sync/i })).toBeNull();
    expect(document.body.textContent).not.toMatch(/sign in|signed in|supabase/i);
  });

  it('Start shows nothing about sync', () => {
    render(<Start />);
    expect(document.body.textContent).not.toMatch(/sync/i);
  });

  it('makes no request, adds no listener, and leaves a sign-in-looking URL alone', async () => {
    const f = vi.fn();
    const add = vi.spyOn(window, 'addEventListener');
    history.replaceState(null, '', '/#access_token=x&refresh_token=y');
    expect(takeAuthFragment()).toBeNull();
    expect(location.hash).toBe('#access_token=x&refresh_token=y');
    await startSync(Promise.resolve(), null, { fetch: f });
    expect(f).not.toHaveBeenCalled();
    expect(add.mock.calls.filter(([type]) => type === 'online')).toEqual([]);
    add.mockRestore();
  });

  it('a config file with a secret key keeps sync off and says why', async () => {
    syncSetup.value = parseSyncConfig({ url: URL_BASE, anonKey: 'sb_secret_x' });
    await commit(startLearner(T0, DEFAULT_COURSES, 60));
    render(<ProgressView />);
    expect(document.querySelector('[data-sync="off"]')?.textContent).toMatch(/not set up \(sync-config\.json: anonKey is a secret key/);
  });
});

describe('sync switched on', () => {
  it('signed out: offers an email link, and says when it is sent', async () => {
    syncSetup.value = ON;
    const server = new FakeSupabase(() => T0);
    await commit(startLearner(T0, DEFAULT_COURSES, 60));
    await startSync(Promise.resolve(), null, { fetch: server.fetch as typeof fetch });
    render(<ProgressView />);
    expect(document.querySelector('[data-sync="off"]')).toBeNull();
    fireEvent.input(screen.getByLabelText('Email'), { target: { value: EMAIL } });
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    await waitFor(() => expect(document.querySelector('[data-sync-sent]')?.textContent).toMatch(`Sign-in link sent to ${EMAIL}`));
    expect(server.emails).toEqual([{ email: EMAIL, redirectTo: `${location.origin}${location.pathname}` }]);
  });

  it('the redirect signs in: tokens leave the URL, the page shows who, when it synced, Sync now, and Sign out', async () => {
    syncSetup.value = ON;
    const server = new FakeSupabase(() => T0);
    history.replaceState(null, '', `/${server.magicLinkFragment(EMAIL)}`);
    const fragment = takeAuthFragment();
    expect(fragment?.kind).toBe('session');
    expect(location.hash).toBe('#/progress');
    expect(route.value).toEqual({ view: 'progress' });

    await commit(startLearner(T0, DEFAULT_COURSES, 60));
    await startSync(Promise.resolve(), fragment, { fetch: server.fetch as typeof fetch });
    render(<ProgressView />);
    await waitFor(() => expect(document.querySelector('[data-sync-user]')?.textContent).toBe(`Signed in as ${EMAIL}.`));
    expect(document.querySelector('[data-sync-last]')?.textContent).toMatch(/^Last synced: /);
    expect(document.body.textContent).toMatch(/also erases your progress on your other devices/);
    expect(server.rows.size).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    await waitFor(() => expect(server.calls.filter((c) => c.method === 'GET').length).toBe(2));

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());
    expect(progress.value?.courses).toEqual(DEFAULT_COURSES);
  });

  it('a new device signs in from Start and receives the progress from the other', async () => {
    syncSetup.value = ON;
    const server = new FakeSupabase(() => T0);
    const uid = server.userId(EMAIL);
    const mac: Progress = { ...startLearner(T0 - 1000, DEFAULT_COURSES, 45), history: [{ at: T0 - 500, kind: 'lesson', topicId: 'pre.fractions', correct: true }] };
    server.rows.set(uid, { user_id: uid, doc: mac, version: 4, updated_at: '' });
    expect(progress.value).toBeNull();
    render(<Start />);
    expect(screen.getByRole('button', { name: 'Email me a sign-in link' })).toBeTruthy();
    await startSync(Promise.resolve(), readAuthFragment(server.magicLinkFragment(EMAIL), T0), { fetch: server.fetch as typeof fetch });
    await flush();
    expect(progress.value?.courses).toEqual(DEFAULT_COURSES);
    expect(progress.value?.settings.budgetMinutes).toBe(45);
    expect(progress.value?.history).toHaveLength(1);
  });

  it('does not start when the local document could not be read', async () => {
    syncSetup.value = ON;
    const f = vi.fn();
    loadState.value = 'error';
    await startSync(Promise.resolve(), null, { fetch: f });
    expect(f).not.toHaveBeenCalled();
  });
});

describe('sign in with the emailed code', () => {
  async function signedOutWith(server: FakeSupabase): Promise<void> {
    syncSetup.value = ON;
    await commit(startLearner(T0, DEFAULT_COURSES, 60));
    await startSync(Promise.resolve(), null, { fetch: server.fetch as typeof fetch });
  }
  const codeBox = (): HTMLElement | null => screen.queryByLabelText('Enter the 6-digit code from the email');

  it('in a browser: the link comes first, with the code offered beside it', async () => {
    const server = new FakeSupabase(() => T0);
    await signedOutWith(server);
    render(<ProgressView />);
    expect(document.querySelector('[data-sync-standalone]')).toBeNull();
    expect(codeBox()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Or enter the code from the email' }));
    expect(codeBox()).toBeTruthy();
  });

  it('in a browser: after the email is sent, the code box opens and signs in', async () => {
    const server = new FakeSupabase(() => T0);
    await signedOutWith(server);
    render(<ProgressView />);
    fireEvent.input(screen.getByLabelText('Email'), { target: { value: EMAIL } });
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    await waitFor(() => expect(document.querySelector('[data-sync-sent]')?.textContent).toBe(
      `Sign-in link sent to ${EMAIL}. Open it on this device to finish signing in, or enter the code from the email.`));
    fireEvent.input(codeBox() as HTMLElement, { target: { value: server.lastCode(EMAIL) } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with code' }));
    await waitFor(() => expect(document.querySelector('[data-sync-user]')?.textContent).toBe(`Signed in as ${EMAIL}.`));
    await waitFor(() => expect(server.rows.size).toBe(1));
  });

  it('a wrong code shows a plain message and keeps the form', async () => {
    const server = new FakeSupabase(() => T0);
    await signedOutWith(server);
    render(<ProgressView />);
    fireEvent.input(screen.getByLabelText('Email'), { target: { value: EMAIL } });
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    await waitFor(() => expect(codeBox()).toBeTruthy());
    fireEvent.input(codeBox() as HTMLElement, { target: { value: server.lastCode(EMAIL) === '000000' ? '111111' : '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with code' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/^That code is not right\./));
    expect(codeBox()).toBeTruthy();
    expect(document.querySelector('[data-sync-user]')).toBeNull();
  });

  it('in the Home Screen app: the code comes first, and it says why the link will not work', async () => {
    standaloneApp.value = true;
    const server = new FakeSupabase(() => T0);
    syncSetup.value = ON;
    render(<Start />);
    await startSync(Promise.resolve(), null, { fetch: server.fetch as typeof fetch });
    expect(document.querySelector('[data-sync-standalone]')?.textContent).toBe(STANDALONE_NOTE);
    expect(STANDALONE_NOTE).toMatch(/link in the email opens Safari, which keeps its own storage, so the link cannot sign in this app/);
    expect(codeBox()).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Email me a sign-in link' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Or enter the code from the email' })).toBeNull();
    expect(document.body.textContent).not.toMatch(/[\u2013\u2014]/);

    fireEvent.input(screen.getByLabelText('Email'), { target: { value: EMAIL } });
    fireEvent.click(screen.getByRole('button', { name: 'Email me a code' }));
    await waitFor(() => expect(document.querySelector('[data-sync-sent]')?.textContent).toBe(`Code sent to ${EMAIL}. Enter it below.`));
    // The same request as the link: one email carries both.
    expect(server.calls.map((c) => c.path)).toEqual(['/auth/v1/otp']);
    fireEvent.input(codeBox() as HTMLElement, { target: { value: server.lastCode(EMAIL) } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with code' }));
    await waitFor(() => expect(syncStatus.value.phase).not.toBe('signed-out'));
    expect(syncStatus.value.email).toBe(EMAIL);
  });

  it('detects the Home Screen app by navigator.standalone or the standalone display mode', () => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const mm = window.matchMedia;
    try {
      window.matchMedia = ((q: string) => ({ matches: false, media: q })) as unknown as typeof window.matchMedia;
      expect(detectStandalone()).toBe(false);
      Object.defineProperty(nav, 'standalone', { value: true, configurable: true });
      expect(detectStandalone()).toBe(true);
      Object.defineProperty(nav, 'standalone', { value: undefined, configurable: true });
      window.matchMedia = ((q: string) => ({ matches: q === '(display-mode: standalone)', media: q })) as unknown as typeof window.matchMedia;
      expect(detectStandalone()).toBe(true);
    } finally {
      window.matchMedia = mm;
      delete (nav as { standalone?: boolean }).standalone;
    }
  });
});
