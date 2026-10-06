/**
 * Sync between devices on the Progress page (and, when sync is set up, on Start, so a
 * second device can sign in before choosing a course). With sync off, the Progress page
 * shows one line saying it is not set up, and Start shows nothing.
 */
import { useState } from 'preact/hooks';
import {
  rememberedEmail, setPassword, signIn, signInWithCode, signInWithPassword, signOut, standaloneApp, syncNow, syncSetup, syncStatus,
} from '@/sync/app';
import { MIN_PASSWORD_CHARS } from '@/sync/engine';

export const SYNC_OFF_TEXT = 'Sync between devices: not set up';

/** The one line shown when sync is off; the reason too when a config file is present but unusable. */
export function SyncOffNote() {
  const { config, error } = syncSetup.value;
  if (config !== null) return null;
  return <p class="small muted" data-sync="off">{SYNC_OFF_TEXT}{error !== null ? ` (sync-config.json: ${error})` : ''}</p>;
}

const when = (t: number | null): string => (t === null ? 'not yet' : new Date(t).toLocaleString('en-GB'));

/** Shown in the Home Screen app, where a password or the code is the only way in. */
export const STANDALONE_NOTE = 'In this Home Screen app, sign in with your password or with the code from the email. The link in the email opens Safari, which keeps its own storage, so the link cannot sign in this app.';

const valueOf = (e: Event): string => (e.currentTarget as HTMLInputElement).value;

/** A show or hide button for password boxes; showing helps on a phone keyboard. */
function ShowToggle({ shown, controls, onToggle }: { shown: boolean; controls: string; onToggle: () => void }) {
  return (
    <button type="button" class="btn btn-small" aria-pressed={shown} aria-controls={controls} onClick={onToggle}>
      {shown ? 'Hide password' : 'Show password'}
    </button>
  );
}

/**
 * One form, so iOS Keychain pairs the email with the password. In the Home Screen app the
 * password comes first and the emailed code below it, since the link opens Safari and
 * signs in Safari instead. In a browser the link comes first, with a password and the code
 * offered beside it. The password lives only in this form's state.
 */
function SignInForm() {
  const s = syncStatus.value;
  const standalone = standaloneApp.value;
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [wantCode, setWantCode] = useState(false);
  const [wantPassword, setWantPassword] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const showPassword = standalone || wantPassword;
  const showCode = standalone || wantCode || s.linkSentTo !== null;
  const run = (f: () => Promise<string | null>): void => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    void f().then((err) => { setProblem(err); setBusy(false); });
  };
  const sendLink = (): void => run(() => signIn(email));
  const sentText = s.linkSentTo === null ? ''
    : standalone ? `Code sent to ${s.linkSentTo}. Enter it below.`
      : `Sign-in link sent to ${s.linkSentTo}. Open it on this device to finish signing in, or enter the code from the email.`;
  const linkButton = (
    <button type={showPassword ? 'button' : 'submit'} class={`btn ${showPassword ? '' : 'btn-primary'}`} disabled={busy}
      onClick={showPassword ? sendLink : undefined}>
      {standalone ? 'Email me a code' : 'Email me a sign-in link'}
    </button>
  );
  const passwordPart = (
    <div data-sync-password>
      <div class="field">
        <label for="sync-password">Password</label>
        <input id="sync-password" name="password" type={showPw ? 'text' : 'password'} autocomplete="current-password" value={password}
          onInput={(e) => setPw(valueOf(e))} />
        <ShowToggle shown={showPw} controls="sync-password" onToggle={() => setShowPw(!showPw)} />
      </div>
      <button type="submit" class="btn btn-primary" disabled={busy}>Sign in</button>
      <p class="small muted">No password yet? Set one on a device that is signed in, under Sync between devices.</p>
    </div>
  );
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); if (showPassword) run(() => signInWithPassword(email, password)); else sendLink(); }}>
        <p class="small muted">
          Sign in with your email on each device to keep one copy of your progress on all of them.
          {standalone ? ' Use your password, or get a code by email.' : ' You get a link by email, or use a password if you set one.'}
        </p>
        {standalone && <p class="small" data-sync-standalone>{STANDALONE_NOTE}</p>}
        <div class="field">
          <label for="sync-email">Email</label>
          <input id="sync-email" name="email" type="email" autocomplete="email" value={email} required
            onInput={(e) => setEmail(valueOf(e))} />
        </div>
        {standalone && passwordPart}
        {standalone && <p class="small" data-sync-or>Or email me a code:</p>}
        {linkButton}
        <p class="small" role="status" data-sync-sent>{sentText}</p>
        {!standalone && (wantPassword ? passwordPart
          : <button type="button" class="btn btn-small" onClick={() => setWantPassword(true)}>Sign in with a password</button>)}
      </form>
      {showCode ? (
        <form data-sync-code onSubmit={(e) => { e.preventDefault(); run(() => signInWithCode(email === '' ? s.linkSentTo ?? '' : email, code)); }}>
          <div class="field">
            <label for="sync-code">Enter the 6-digit code from the email</label>
            <input id="sync-code" type="text" inputMode="numeric" autocomplete="one-time-code" value={code}
              onInput={(e) => setCode(valueOf(e))} />
          </div>
          <button type="submit" class="btn" disabled={busy}>Sign in with code</button>
        </form>
      ) : (
        <button type="button" class="btn btn-small" onClick={() => setWantCode(true)}>Or enter the code from the email</button>
      )}
      {problem !== null && <p class="small error-text" role="alert">{problem}</p>}
    </div>
  );
}

/**
 * Sets a password for the signed-in account, for signing in where no email link reaches
 * (the Home Screen app). The fields clear once it is set; nothing keeps the password.
 */
function SetPasswordForm() {
  const s = syncStatus.value;
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const submit = (e: Event): void => {
    e.preventDefault();
    if (busy) return;
    setDone(false);
    if (pw.length < MIN_PASSWORD_CHARS) { setProblem(`Use at least ${MIN_PASSWORD_CHARS} characters.`); return; }
    if (pw !== again) { setProblem('The two passwords do not match.'); return; }
    setBusy(true);
    setProblem(null);
    void setPassword(pw).then((err) => {
      setBusy(false);
      setProblem(err);
      if (err === null) {
        setPw('');
        setAgain('');
        setShow(false);
        setDone(true);
      }
    });
  };
  return (
    <details data-sync-set-password>
      <summary>Set a password for this account</summary>
      <form onSubmit={submit}>
        <p class="small muted">
          Then sign in with this email and password on another device, such as the iPhone Home Screen app, with no email needed.
        </p>
        {/* The account's email, so iOS Keychain saves the new password under it. */}
        <input type="email" name="email" autocomplete="email" value={s.email ?? ''} readOnly hidden />
        <div class="field">
          <label for="sync-new-password">New password (at least {MIN_PASSWORD_CHARS} characters)</label>
          <input id="sync-new-password" name="new-password" type={show ? 'text' : 'password'} autocomplete="new-password"
            minLength={MIN_PASSWORD_CHARS} value={pw} onInput={(e) => setPw(valueOf(e))} />
        </div>
        <div class="field">
          <label for="sync-confirm-password">Confirm new password</label>
          <input id="sync-confirm-password" name="confirm-password" type={show ? 'text' : 'password'} autocomplete="new-password"
            minLength={MIN_PASSWORD_CHARS} value={again} onInput={(e) => setAgain(valueOf(e))} />
        </div>
        <ShowToggle shown={show} controls="sync-new-password sync-confirm-password" onToggle={() => setShow(!show)} />
        <button type="submit" class="btn" disabled={busy}>Set password</button>
        <p class="small" role="status" data-sync-password-set>{done ? 'Password set. Use it with this email to sign in on your other devices.' : ''}</p>
        {problem !== null && <p class="small error-text" role="alert" data-sync-password-problem>{problem}</p>}
      </form>
    </details>
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
      <SetPasswordForm />
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
