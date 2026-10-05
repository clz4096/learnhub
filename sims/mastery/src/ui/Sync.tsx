/**
 * Sync between devices on the Progress page (and, when sync is set up, on Start, so a
 * second device can sign in before choosing a course). With sync off, the Progress page
 * shows one line saying it is not set up, and Start shows nothing.
 */
import { useState } from 'preact/hooks';
import { signIn, signOut, syncNow, syncSetup, syncStatus } from '@/sync/app';

export const SYNC_OFF_TEXT = 'Sync between devices: not set up';

/** The one line shown when sync is off; the reason too when a config file is present but unusable. */
export function SyncOffNote() {
  const { config, error } = syncSetup.value;
  if (config !== null) return null;
  return <p class="small muted" data-sync="off">{SYNC_OFF_TEXT}{error !== null ? ` (sync-config.json: ${error})` : ''}</p>;
}

const when = (t: number | null): string => (t === null ? 'not yet' : new Date(t).toLocaleString('en-GB'));

function SignInForm() {
  const s = syncStatus.value;
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const send = (): void => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    void signIn(email).then((err) => { setProblem(err); setBusy(false); });
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); send(); }}>
      <p class="small muted">Sign in with your email on each device to keep one copy of your progress on all of them. No password: you get a link by email.</p>
      <div class="field">
        <label for="sync-email">Email</label>
        <input id="sync-email" type="email" autocomplete="email" value={email} required
          onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)} />
      </div>
      <button type="submit" class="btn btn-primary" disabled={busy}>Email me a sign-in link</button>
      <p class="small" role="status" data-sync-sent>
        {s.linkSentTo !== null ? `Sign-in link sent to ${s.linkSentTo}. Open it on this device to finish signing in.` : ''}
      </p>
      {problem !== null && <p class="small error-text" role="alert">{problem}</p>}
    </form>
  );
}

function SignedIn() {
  const s = syncStatus.value;
  return (
    <div>
      <p class="small" data-sync-user>Signed in as <strong>{s.email ?? 'your account'}</strong>.</p>
      <p class="small" role="status" data-sync-last>
        {s.phase === 'syncing' ? 'Syncing now.' : `Last synced: ${when(s.lastSyncedAt)}.`}
        {s.pending && s.phase !== 'syncing' ? ' Changes on this device are waiting to sync.' : ''}
      </p>
      <div class="actions">
        <button type="button" class="btn" disabled={s.phase === 'syncing'} onClick={() => void syncNow()}>Sync now</button>
        <button type="button" class="btn" onClick={() => void signOut()}>Sign out</button>
      </div>
    </div>
  );
}

/** The sync card: sign in, or who is signed in, when it last synced, and what went wrong. Null when sync is off. */
export function SyncCard() {
  if (syncSetup.value.config === null) return null;
  const s = syncStatus.value;
  return (
    <section class="card sync" aria-labelledby="sync-title" data-sync="on">
      <h2 id="sync-title">Sync between devices</h2>
      {s.phase === 'signed-out' ? <SignInForm /> : <SignedIn />}
      {s.message !== null && <p class={`small ${s.phase === 'error' || s.phase === 'signed-out' ? 'error-text' : 'muted'}`} role="alert">{s.message}</p>}
      {s.remoteErrors.length > 0 && <ul class="small error">{s.remoteErrors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}</ul>}
    </section>
  );
}

/** True when this device is signed in to sync, so an erase will reach the other devices. */
export const syncSignedIn = (): boolean => syncSetup.value.config !== null && syncStatus.value.phase !== 'signed-out';
