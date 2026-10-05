/**
 * The few Supabase endpoints sync uses, over plain fetch: no client library, so no new
 * runtime dependency and nothing here the app does not need.
 *
 *   POST /auth/v1/otp                           email a magic sign-in link
 *   (redirect)  <page>#access_token=...         the session, read from the URL fragment
 *   POST /auth/v1/token?grant_type=refresh_token  a fresh access token
 *   POST /auth/v1/logout?scope=local            end this device's session only
 *   GET  /rest/v1/learnhub_progress             the learner's row (row-level security)
 *   POST /rest/v1/learnhub_progress             upsert the row (merge-duplicates)
 *
 * The magic link uses the implicit flow (tokens in the fragment), not PKCE: PKCE ties the
 * link to the browser that asked for it, and the learner may ask on the Mac and open the
 * mail on the phone. The fragment never reaches a server (GitHub Pages sees no part of
 * it), and the app removes it from the address bar and history as soon as it loads.
 */
import { jwtPayload, type SyncConfig } from './config';

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** ms since the epoch. */
  expiresAt: number;
  userId: string;
  email: string | null;
}

/** A failed request. `retry` is true when trying again later may work (offline, overloaded, rate limited). */
export class SyncHttpError extends Error {
  constructor(message: string, readonly status: number, readonly retry: boolean, readonly code: string | null = null) {
    super(message);
    this.name = 'SyncHttpError';
  }
}

export const TABLE = 'learnhub_progress';

function headers(cfg: SyncConfig, token: string | null, extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { apikey: cfg.anonKey, Accept: 'application/json', ...extra };
  if (token !== null) h.Authorization = `Bearer ${token}`;
  return h;
}

/** The error text Supabase sent, in whichever field this service uses. */
async function errorOf(r: Response): Promise<{ text: string; code: string | null }> {
  let body: unknown = null;
  try {
    body = await r.json();
  } catch {
    // Not JSON: fall back to the status.
  }
  const o = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const text = [o.msg, o.error_description, o.message, o.error].find((x) => typeof x === 'string' && x !== '') as string | undefined;
  const code = [o.error_code, o.code].find((x) => typeof x === 'string') as string | undefined;
  return { text: text ?? `HTTP ${r.status}`, code: code ?? null };
}

async function send(f: FetchLike, url: string, init: RequestInit, what: string): Promise<Response> {
  let r: Response;
  try {
    r = await f(url, init);
  } catch (e) {
    throw new SyncHttpError(`${what}: no connection (${e instanceof Error ? e.message : String(e)})`, 0, true);
  }
  if (r.ok) return r;
  const { text, code } = await errorOf(r);
  const retry = r.status === 408 || r.status === 429 || r.status >= 500;
  throw new SyncHttpError(`${what}: ${text}`, r.status, retry, code);
}

/** Emails a sign-in link that returns to `redirectTo`, which must be in the project's redirect allow list. */
export async function requestLink(cfg: SyncConfig, f: FetchLike, email: string, redirectTo: string): Promise<void> {
  await send(f, `${cfg.url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST',
    headers: headers(cfg, null, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, create_user: true }),
  }, 'sending the sign-in link');
}

function sessionFrom(access: string, refresh: string, expiresAt: number): Session | null {
  const claims = jwtPayload(access);
  if (claims === null || typeof claims.sub !== 'string' || claims.sub === '' || refresh === '') return null;
  return { accessToken: access, refreshToken: refresh, expiresAt, userId: claims.sub, email: typeof claims.email === 'string' ? claims.email : null };
}

/** Expiry in ms from a token response's `expires_at` (seconds) or `expires_in` (seconds from now). */
function expiryOf(expiresAt: unknown, expiresIn: unknown, now: number): number {
  const at = Number(expiresAt);
  if (Number.isFinite(at) && at > 0) return at * 1000;
  const inS = Number(expiresIn);
  return now + (Number.isFinite(inS) && inS > 0 ? inS : 3600) * 1000;
}

export type FragmentResult = { kind: 'session'; session: Session } | { kind: 'error'; message: string };

/**
 * Reads what the magic link's redirect put in the URL fragment: a session, an error, or
 * null when the fragment is an ordinary route (`#/today`).
 */
export function readAuthFragment(hash: string, now: number): FragmentResult | null {
  const raw = hash.replace(/^#/, '');
  if (!/(^|&)(access_token|error|error_description)=/.test(raw)) return null;
  const q = new URLSearchParams(raw);
  const err = q.get('error_description') ?? q.get('error');
  if (err !== null) return { kind: 'error', message: `Sign-in failed: ${err}` };
  const s = sessionFrom(q.get('access_token') ?? '', q.get('refresh_token') ?? '', expiryOf(q.get('expires_at'), q.get('expires_in'), now));
  return s === null ? { kind: 'error', message: 'Sign-in failed: the link did not carry a usable session' } : { kind: 'session', session: s };
}

/** A fresh session from the refresh token. Supabase rotates refresh tokens, so the new one replaces the old. */
export async function refreshSession(cfg: SyncConfig, f: FetchLike, refreshToken: string, now: number): Promise<Session> {
  const r = await send(f, `${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: headers(cfg, null, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ refresh_token: refreshToken }),
  }, 'renewing the sign-in');
  const o = (await r.json()) as Record<string, unknown>;
  const s = sessionFrom(String(o.access_token ?? ''), String(o.refresh_token ?? ''), expiryOf(o.expires_at, o.expires_in, now));
  if (s === null) throw new SyncHttpError('renewing the sign-in: the response held no usable session', r.status, false);
  return s;
}

/** Ends this device's session on the server. The other device stays signed in. */
export async function logout(cfg: SyncConfig, f: FetchLike, accessToken: string): Promise<void> {
  await send(f, `${cfg.url}/auth/v1/logout?scope=local`, { method: 'POST', headers: headers(cfg, accessToken) }, 'signing out');
}

export interface RemoteRow {
  doc: unknown;
  version: number;
  updated_at: string;
}

/** The learner's row, or null before the first push. */
export async function pullRow(cfg: SyncConfig, f: FetchLike, s: Session): Promise<RemoteRow | null> {
  const url = `${cfg.url}/rest/v1/${TABLE}?select=doc,version,updated_at&user_id=eq.${encodeURIComponent(s.userId)}`;
  const r = await send(f, url, { method: 'GET', headers: headers(cfg, s.accessToken) }, 'reading the synced copy');
  let rows: unknown;
  try {
    rows = await r.json();
  } catch {
    throw new SyncHttpError('reading the synced copy: the response was not JSON', r.status, true);
  }
  if (!Array.isArray(rows)) throw new SyncHttpError('reading the synced copy: expected a list of rows', r.status, false);
  const row = rows[0] as Record<string, unknown> | undefined;
  if (row === undefined) return null;
  return { doc: row.doc, version: Number(row.version), updated_at: String(row.updated_at) };
}

/** Inserts or replaces the learner's row. `doc` is the progress document as JSON text. */
export async function pushRow(cfg: SyncConfig, f: FetchLike, s: Session, docJson: string, version: number): Promise<void> {
  await send(f, `${cfg.url}/rest/v1/${TABLE}?on_conflict=user_id`, {
    method: 'POST',
    headers: headers(cfg, s.accessToken, { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: `{"user_id":${JSON.stringify(s.userId)},"version":${version},"doc":${docJson}}`,
  }, 'saving the synced copy');
}
