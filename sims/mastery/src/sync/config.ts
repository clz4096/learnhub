/**
 * Sync configuration: the Supabase project URL and its anon key, nothing else.
 *
 * Both are public by design: the anon key only identifies the project, and row-level
 * security on `learnhub_progress` decides what a signed-in user may read or write. So the
 * config is a committed file, `sims/mastery/sync-config.json`, bundled at build time. When
 * the file is absent, sync is off and the app behaves exactly as before sync existed.
 *
 * A key that grants more than the anon role (a service-role JWT or an `sb_secret_` key)
 * is refused, and sync stays off: such a key bypasses row-level security, so it must never
 * ship in a public page even by mistake.
 */

export interface SyncConfig {
  /** The project URL, `https://<ref>.supabase.co`, without a trailing slash. */
  url: string;
  anonKey: string;
}

export type ConfigResult = { config: SyncConfig; error: null } | { config: null; error: string | null };

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);

/** The payload of a JWT, or null when the text is not one. No signature check: this only reads the role. */
export function jwtPayload(token: string): Obj | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[1] === undefined) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json: unknown = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    return isObj(json) ? json : null;
  } catch {
    return null;
  }
}

function checkUrl(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  let u: URL;
  try {
    u = new URL(x);
  } catch {
    return null;
  }
  const local = u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  // Plain http only for a local Supabase in development; tokens never cross the network unencrypted.
  if (u.protocol !== 'https:' && !(local && u.protocol === 'http:')) return null;
  if (u.search !== '' || u.hash !== '' || u.username !== '' || u.password !== '') return null;
  return u.origin + u.pathname.replace(/\/+$/, '');
}

/** Why a key cannot be used in the browser, or null when it is a public (anon or publishable) key. */
function keyProblem(k: unknown): string | null {
  if (typeof k !== 'string' || k.trim() === '') return 'anonKey must be the project\'s anon (public) key';
  if (k.startsWith('sb_secret_')) return 'anonKey is a secret key; use the publishable (anon) key';
  if (k.startsWith('sb_publishable_')) return null;
  const p = jwtPayload(k);
  if (p === null) return 'anonKey is not a Supabase anon key';
  if (p.role !== 'anon') return `anonKey has role ${JSON.stringify(p.role)}; only the anon key may be used in the browser`;
  return null;
}

/** Validates a parsed config file. Undefined (no file) is off with no error. */
export function parseSyncConfig(x: unknown): ConfigResult {
  if (x === undefined || x === null) return { config: null, error: null };
  if (!isObj(x)) return { config: null, error: 'sync-config.json must hold an object with url and anonKey' };
  const unknown = Object.keys(x).filter((k) => k !== 'url' && k !== 'anonKey' && k !== '$comment');
  if (unknown.length > 0) return { config: null, error: `sync-config.json has unknown fields: ${unknown.join(', ')}` };
  const url = checkUrl(x.url);
  if (url === null) return { config: null, error: 'url must be the project URL, like https://abcd.supabase.co' };
  const problem = keyProblem(x.anonKey);
  if (problem !== null) return { config: null, error: problem };
  return { config: { url, anonKey: (x.anonKey as string).trim() }, error: null };
}

/**
 * The bundled config. `import.meta.glob` matches nothing when the file is absent, so a
 * build without it compiles, and no request is made at run time.
 */
export function bundledSyncConfig(): ConfigResult {
  const files = import.meta.glob<unknown>('/sync-config.json', { eager: true, import: 'default' });
  return parseSyncConfig(Object.values(files)[0]);
}
