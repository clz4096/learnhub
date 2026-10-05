// node --test: the progress sync table's access rules, and the committed sync config.
// Both are security boundaries that no browser test reaches: the SQL runs only in
// Supabase, and the config ships in the public site. A failure here stops CI before deploy.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SQL = readFileSync(path.join(ROOT, 'supabase', 'learnhub_progress.sql'), 'utf8');
// The statements without comments, so a commented-out line cannot satisfy a check.
const CODE = SQL.split('\n').map((l) => l.replace(/--.*$/, '')).join('\n').replace(/\s+/g, ' ').toLowerCase();

describe('supabase/learnhub_progress.sql', () => {
  it('has the agreed columns, keyed by the auth user with a cascade', () => {
    assert.match(CODE, /user_id uuid primary key references auth\.users \(id\) on delete cascade/);
    assert.match(CODE, /doc jsonb not null/);
    assert.match(CODE, /version int not null/);
    assert.match(CODE, /updated_at timestamptz not null default now\(\)/);
  });

  it('turns on row-level security', () => {
    assert.match(CODE, /alter table public\.learnhub_progress enable row level security/);
  });

  it('lets a user select, insert, and update only their own row, and has no delete policy', () => {
    const policies = [...CODE.matchAll(/create policy "[^"]+" on public\.learnhub_progress for (\w+) to (\w+) (using|with check) \(\(select auth\.uid\(\)\) = user_id\)/g)];
    assert.deepEqual(policies.map((m) => m[1]).sort(), ['insert', 'select', 'update']);
    assert.ok(policies.every((m) => m[2] === 'authenticated'));
    assert.match(CODE, /for update to authenticated using \(\(select auth\.uid\(\)\) = user_id\) with check \(\(select auth\.uid\(\)\) = user_id\)/);
    assert.doesNotMatch(CODE, /for (delete|all)\b/);
  });

  it('grants the anonymous role nothing and the signed-in role no delete', () => {
    assert.match(CODE, /revoke all on table public\.learnhub_progress from anon, authenticated/);
    assert.match(CODE, /grant select, insert, update on table public\.learnhub_progress to authenticated/);
    assert.doesNotMatch(CODE, /grant [^;]*\b(delete|all)\b[^;]*learnhub_progress/);
  });

  it('caps the document size', () => {
    assert.match(CODE, /check \(pg_column_size\(doc\) < 2 \* 1024 \* 1024\)/);
  });

  it('runs in one transaction', () => {
    assert.match(CODE, /^ ?begin;/);
    assert.match(CODE, /commit; ?$/);
  });
});

describe('sims/mastery/sync-config.json', () => {
  const file = path.join(ROOT, 'sims', 'mastery', 'sync-config.json');

  it('when committed, holds only the public URL and an anon key', { skip: !existsSync(file) && 'no config: sync is off' }, () => {
    const cfg = JSON.parse(readFileSync(file, 'utf8'));
    assert.deepEqual(Object.keys(cfg).filter((k) => k !== '$comment').sort(), ['anonKey', 'url']);
    assert.match(cfg.url, /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/);
    assert.ok(!cfg.anonKey.startsWith('sb_secret_'), 'a secret key must never be committed');
    if (!cfg.anonKey.startsWith('sb_publishable_')) {
      const payload = JSON.parse(Buffer.from(cfg.anonKey.split('.')[1] ?? '', 'base64url').toString('utf8'));
      assert.equal(payload.role, 'anon', 'only the anon key may be committed');
    }
  });

  it('no file anywhere in the app holds a service-role or secret key', () => {
    for (const rel of ['sims/mastery/sync-config.example.json', 'sims/mastery/sync-config.json']) {
      const p = path.join(ROOT, rel);
      if (!existsSync(p)) continue;
      const text = readFileSync(p, 'utf8');
      assert.doesNotMatch(text, /sb_secret_[A-Za-z0-9]/);
      for (const jwt of text.match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g) ?? []) {
        const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
        assert.notEqual(payload.role, 'service_role', `${rel} holds a service-role key`);
      }
    }
  });
});
