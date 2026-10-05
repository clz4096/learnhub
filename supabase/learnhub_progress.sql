-- learnhub progress sync: one row per learner holding their whole progress document.
--
-- Run once in the Supabase SQL editor (see SYNC-SETUP.md). Safe to run again: every
-- statement replaces or skips what already exists. Nothing here touches any other table,
-- so the context orchestrator's tables in the same project are unaffected.
--
-- The browser talks to this table directly through PostgREST with the public anon key
-- and the learner's own access token, so row-level security below is the whole access
-- control. There is no service-role key anywhere in learnhub.

begin;

create table if not exists public.learnhub_progress (
  -- One row per Supabase Auth user. Deleting the user deletes their progress, which is
  -- why no delete policy is needed: the browser never deletes, the cascade cleans up.
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- The progress document (packages/mastery, Progress), validated by the app's importer
  -- on every pull. The server stores it opaquely; merging happens in the browser.
  doc jsonb not null,
  -- The document's schema version, so a newer build's row can be spotted without parsing.
  version int not null,
  -- Set by the trigger below on every write, from the server clock, not the device's.
  updated_at timestamptz not null default now(),

  -- Size guard: a real document is tens of kilobytes; 2 MiB stops a bug or an abusive
  -- client from filling the free-tier database. The app refuses to push above 1.5 MB.
  constraint learnhub_progress_doc_size check (pg_column_size(doc) < 2 * 1024 * 1024),
  -- The document is always a JSON object; anything else is a client bug.
  constraint learnhub_progress_doc_object check (jsonb_typeof(doc) = 'object'),
  constraint learnhub_progress_version_positive check (version > 0)
);

-- Without RLS, any holder of the public anon key could read every row.
alter table public.learnhub_progress enable row level security;

-- Least privilege. Supabase grants new public tables to anon and authenticated by
-- default; the anonymous role needs nothing here, and a signed-in user needs only to read,
-- insert, and update (the upsert). No delete, truncate, or references.
revoke all on table public.learnhub_progress from anon, authenticated;
grant select, insert, update on table public.learnhub_progress to authenticated;

-- A user sees, creates, and changes only their own row. `(select auth.uid())` is
-- evaluated once per statement rather than once per row (Supabase's RLS guidance).
-- The upsert (INSERT ... ON CONFLICT DO UPDATE) needs all three policies.
drop policy if exists "learnhub_progress select own" on public.learnhub_progress;
create policy "learnhub_progress select own" on public.learnhub_progress
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "learnhub_progress insert own" on public.learnhub_progress;
create policy "learnhub_progress insert own" on public.learnhub_progress
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- USING limits which row can be updated; WITH CHECK stops moving a row to another user.
drop policy if exists "learnhub_progress update own" on public.learnhub_progress;
create policy "learnhub_progress update own" on public.learnhub_progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- updated_at from the server clock on every insert and update. The upsert sends only
-- user_id, version, and doc, so without this an update would keep the first insert's time.
-- An empty search_path keeps the function from resolving names through a caller's path.
create or replace function public.learnhub_progress_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists learnhub_progress_touch on public.learnhub_progress;
create trigger learnhub_progress_touch
  before insert or update on public.learnhub_progress
  for each row execute function public.learnhub_progress_touch();

commit;

-- Checks to run after (each should return what its comment says):
--   select relrowsecurity from pg_class where oid = 'public.learnhub_progress'::regclass;  -- true
--   select policyname, cmd from pg_policies where tablename = 'learnhub_progress';      -- 3 rows: SELECT, INSERT, UPDATE
--   select grantee, privilege_type from information_schema.role_table_grants
--     where table_name = 'learnhub_progress' and grantee in ('anon', 'authenticated');  -- authenticated: SELECT, INSERT, UPDATE only
