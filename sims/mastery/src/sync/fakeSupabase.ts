/**
 * A fake Supabase for tests: the auth and REST endpoints sync calls, with the behaviour
 * that matters to it. Access tokens expire, refresh tokens rotate (an old one is refused),
 * row-level security lets a token read and write only its own row, the table's size check
 * refuses a huge document, and the network can be cut. Each sign-in email carries a
 * one-time code: only the newest code for an address works, once, within the hour, and a
 * wrong code and an expired one get GoTrue's same answer (403, `otp_expired`).
 *
 * Passwords: a signed-in user sets one with PUT /auth/v1/user and signs in with the
 * password grant. A wrong password and an unknown email get the same 400; a password under
 * the project's minimum gets 422 `weak_password`; with "Secure password change" on, a
 * session that began more than a day ago gets 400 `reauthentication_needed`, as GoTrue
 * does when no reauthentication nonce is sent.
 */
import type { FetchLike } from './supabase';

const b64url = (s: string): string => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** An unsigned JWT with the given claims: enough for code that only reads claims. */
export function fakeJwt(claims: Record<string, unknown>): string {
  return `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claims))}.sig`;
}

export const ANON_KEY = fakeJwt({ iss: 'supabase', ref: 'testref', role: 'anon' });
export const SERVICE_KEY = fakeJwt({ iss: 'supabase', ref: 'testref', role: 'service_role' });
export const URL_BASE = 'https://testref.supabase.co';
export const TABLE_LIMIT_BYTES = 2 * 1024 * 1024;
/** GoTrue's default "Email OTP Expiration". */
export const OTP_TTL_MS = 3600_000;
/** GoTrue lets a session change the password without reauthentication for this long. */
export const REAUTH_WINDOW_MS = 24 * 3600_000;

export interface Row {
  user_id: string;
  doc: unknown;
  version: number;
  updated_at: string;
}

export interface Call {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  body: string | null;
}

const json = (status: number, body: unknown): Response =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export class FakeSupabase {
  readonly rows = new Map<string, Row>();
  readonly calls: Call[] = [];
  readonly emails: { email: string; redirectTo: string | null }[] = [];
  online = true;
  /** Responses to fail with, in order, before handling normally. */
  readonly failures: number[] = [];
  /** Runs before a request is handled, to interleave another device. */
  before: ((c: Call) => Promise<void>) | null = null;
  private readonly users = new Map<string, string>();
  /** `start` is when the session began; a refresh keeps it, as GoTrue's session does. */
  private readonly access = new Map<string, { sub: string; exp: number; start: number }>();
  private readonly refresh = new Map<string, { sub: string; start: number }>();
  private readonly passwords = new Map<string, string>();
  /** The project's "Minimum password length" (GoTrue's default is 6). */
  minPasswordLength = 6;
  /** The project's "Secure password change" setting. */
  securePasswordChange = false;
  /** Answer a wrong password as older GoTrue did: `{ error: 'invalid_grant' }`. */
  legacyGrantErrors = false;
  /** The newest code emailed to each address; sending again replaces it, as GoTrue does. */
  private readonly codes = new Map<string, { code: string; at: number }>();
  private serial = 0;
  private codeSerial = 0;

  constructor(private readonly clock: () => number, private readonly ttlMs = 3600_000) {}

  private userFor(email: string): string {
    let id = this.users.get(email);
    if (id === undefined) {
      id = `00000000-0000-4000-8000-${String(this.users.size + 1).padStart(12, '0')}`;
      this.users.set(email, id);
    }
    return id;
  }

  private issue(sub: string, email: string, start = this.clock()): { access_token: string; refresh_token: string; expires_in: number; expires_at: number } {
    const n = ++this.serial;
    const exp = this.clock() + this.ttlMs;
    const access = fakeJwt({ sub, email, role: 'authenticated', exp: Math.floor(exp / 1000), n });
    const refresh = `rt-${n}`;
    this.access.set(access, { sub, exp, start });
    this.refresh.set(refresh, { sub, start });
    return { access_token: access, refresh_token: refresh, expires_in: Math.round(this.ttlMs / 1000), expires_at: Math.floor(exp / 1000) };
  }

  /** The fragment GoTrue appends to the redirect URL when the learner opens the emailed link. */
  magicLinkFragment(email: string): string {
    const t = this.issue(this.userFor(email), email);
    return `#access_token=${t.access_token}&expires_at=${t.expires_at}&expires_in=${t.expires_in}&refresh_token=${t.refresh_token}&token_type=bearer&type=magiclink`;
  }

  /** The code in the newest sign-in email to this address, as the learner would read it. */
  lastCode(email: string): string | undefined {
    return this.codes.get(email.toLowerCase())?.code;
  }

  /** Ends every access token now, as if an hour passed on the server. */
  expireAccessTokens(): void {
    for (const v of this.access.values()) v.exp = 0;
  }

  revokeRefreshTokens(): void {
    this.refresh.clear();
  }

  userId(email: string): string {
    return this.userFor(email);
  }

  /** The account's password, as the server holds it (a real one keeps only a hash). */
  passwordOf(email: string): string | undefined {
    return this.passwords.get(email.toLowerCase());
  }

  private emailOf(sub: string): string {
    return [...this.users].find(([, id]) => id === sub)?.[0] ?? '';
  }

  readonly fetch: FetchLike = async (url, init = {}) => {
    const u = new URL(url);
    const headers = Object.fromEntries(Object.entries((init.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
    const call: Call = { method: init.method ?? 'GET', path: u.pathname, query: u.searchParams, headers, body: typeof init.body === 'string' ? init.body : null };
    this.calls.push(call);
    if (this.before !== null) {
      const b = this.before;
      this.before = null;
      await b(call);
    }
    if (!this.online) throw new TypeError('Failed to fetch');
    const fail = this.failures.shift();
    if (fail !== undefined) return json(fail, { message: `fake failure ${fail}` });
    if (u.origin !== URL_BASE) return json(404, { message: 'no such host' });
    if (headers.apikey !== ANON_KEY) return json(401, { message: 'Invalid API key' });
    return this.handle(call);
  };

  private bearer(c: Call): string | null {
    return this.session(c)?.sub ?? null;
  }

  private session(c: Call): { sub: string; start: number } | null {
    const token = c.headers.authorization?.replace(/^Bearer /, '') ?? '';
    const a = this.access.get(token);
    return a === undefined || a.exp <= this.clock() ? null : a;
  }

  private handle(c: Call): Response {
    const body = c.body === null ? null : (JSON.parse(c.body) as Record<string, unknown>);
    if (c.method === 'POST' && c.path === '/auth/v1/otp') {
      this.emails.push({ email: String(body?.email), redirectTo: c.query.get('redirect_to') });
      const code = String(100000 + ((++this.codeSerial * 271_829) % 900_000));
      this.codes.set(String(body?.email).toLowerCase(), { code, at: this.clock() });
      return json(200, {});
    }
    if (c.method === 'POST' && c.path === '/auth/v1/verify') {
      // GoTrue takes `email` for an emailed code, and still the older `magiclink` name.
      if (body?.type !== 'email' && body?.type !== 'magiclink') {
        return json(400, { code: 400, error_code: 'validation_failed', msg: 'Verify requires a verification type' });
      }
      if (typeof body.email !== 'string' || typeof body.token !== 'string') {
        return json(400, { code: 400, error_code: 'validation_failed', msg: 'Only an email address or phone number should be provided on verify' });
      }
      const email = body.email.toLowerCase();
      const sent = this.codes.get(email);
      if (sent === undefined || sent.code !== body.token || this.clock() - sent.at >= OTP_TTL_MS) {
        return json(403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
      }
      this.codes.delete(email);
      const sub = this.userFor(body.email);
      return json(200, { ...this.issue(sub, body.email), token_type: 'bearer', user: { id: sub, email: body.email } });
    }
    if (c.method === 'POST' && c.path === '/auth/v1/token' && c.query.get('grant_type') === 'refresh_token') {
      const old = String(body?.refresh_token);
      const r = this.refresh.get(old);
      if (r === undefined) return json(400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token: Refresh Token Not Found' });
      this.refresh.delete(old);
      const email = this.emailOf(r.sub);
      return json(200, { ...this.issue(r.sub, email, r.start), token_type: 'bearer', user: { id: r.sub, email } });
    }
    if (c.method === 'POST' && c.path === '/auth/v1/token' && c.query.get('grant_type') === 'password') {
      const email = typeof body?.email === 'string' ? body.email.toLowerCase() : '';
      const known = this.passwords.get(email);
      if (known === undefined || known !== body?.password) {
        return this.legacyGrantErrors
          ? json(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' })
          : json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      }
      const sub = this.userFor(email);
      return json(200, { ...this.issue(sub, email), token_type: 'bearer', user: { id: sub, email } });
    }
    if (c.method === 'PUT' && c.path === '/auth/v1/user') {
      const sess = this.session(c);
      if (sess === null) return json(403, { code: 403, error_code: 'bad_jwt', msg: 'invalid JWT: unable to parse or verify signature, token has invalid claims: token is expired' });
      const password = body?.password;
      if (typeof password !== 'string') return json(400, { code: 400, error_code: 'validation_failed', msg: 'Invalid request' });
      if (this.securePasswordChange && this.clock() - sess.start > REAUTH_WINDOW_MS && typeof body?.nonce !== 'string') {
        return json(400, { code: 400, error_code: 'reauthentication_needed', msg: 'Password update requires reauthentication' });
      }
      if (password.length < this.minPasswordLength) {
        return json(422, {
          code: 422, error_code: 'weak_password', msg: `Password should be at least ${this.minPasswordLength} characters.`,
          weak_password: { reasons: ['length'] },
        });
      }
      const email = this.emailOf(sess.sub).toLowerCase();
      if (this.passwords.get(email) === password) {
        return json(422, { code: 422, error_code: 'same_password', msg: 'New password should be different from the old password.' });
      }
      this.passwords.set(email, password);
      return json(200, { id: sess.sub, email });
    }
    if (c.method === 'POST' && c.path === '/auth/v1/logout') return new Response(null, { status: 204 });
    if (c.path === '/rest/v1/learnhub_progress') {
      const sub = this.bearer(c);
      if (sub === null) return json(401, { code: 'PGRST301', message: 'JWT expired' });
      if (c.method === 'GET') {
        const want = c.query.get('user_id')?.replace(/^eq\./, '');
        const row = this.rows.get(sub);
        // Row-level security: only the caller's own row is visible, whatever the filter says.
        const visible = row !== undefined && (want === undefined || want === sub) ? [row] : [];
        return json(200, visible.map((r) => ({ doc: r.doc, version: r.version, updated_at: r.updated_at })));
      }
      if (c.method === 'POST') {
        if (!(c.headers.prefer ?? '').includes('resolution=merge-duplicates')) return json(409, { code: '23505', message: 'duplicate key' });
        if (body?.user_id !== sub) return json(403, { code: '42501', message: 'new row violates row-level security policy' });
        if (new TextEncoder().encode(JSON.stringify(body.doc)).length >= TABLE_LIMIT_BYTES) {
          return json(400, { code: '23514', message: 'new row violates check constraint "learnhub_progress_doc_size"' });
        }
        this.rows.set(sub, { user_id: sub, doc: body.doc, version: Number(body.version), updated_at: new Date(this.clock()).toISOString() });
        return new Response(null, { status: 201 });
      }
    }
    return json(404, { message: `no route ${c.method} ${c.path}` });
  }
}
