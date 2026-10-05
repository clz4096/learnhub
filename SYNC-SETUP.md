# Switching on progress sync between devices

*Written 2026-10-05.*

Progress sync is built and tested but ships **off**: no config file is committed, so the live
site behaves as before and the Progress page shows only "Sync between devices: not set up".
These steps switch it on. They take about 15 minutes.

Sync was shipped off because the Supabase project (ref `wloyfktbyjtwqdinohob`) answered
"tenant/user ... not found" on 2026-10-04, which usually means it is paused or deleted.

## What you need

- The Supabase dashboard, signed in as the project owner.
- This repository on the Mac, with `npm ci` done.
- Your email inbox on the Mac and on the phone.

## 1. Restore the Supabase project

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) and find the project with
   ref `wloyfktbyjtwqdinohob`.
2. If it shows **Paused**, select **Restore project** and wait until it is healthy (a few
   minutes).
3. If it is gone (deleted, or paused too long to restore), create a new free project and use
   its ref in the steps below. **The context orchestrator uses the same project**: a new
   project means the orchestrator also needs its tables, Edge Functions, and secrets set up
   again there, and its config pointed at the new ref.

## 2. Create the table

1. In the dashboard, open **SQL Editor**, then **New query**.
2. Paste all of [`supabase/learnhub_progress.sql`](supabase/learnhub_progress.sql) and select
   **Run**. It is safe to run twice, and it touches no other table.
3. Run the three check queries at the end of that file (in comments) and confirm: row-level
   security is `true`; there are three policies (SELECT, INSERT, UPDATE); and only
   `authenticated` holds SELECT, INSERT, and UPDATE.

## 3. Configure sign-in

Under **Authentication**:

1. **URL Configuration**:
   - **Site URL**: `https://clz4096.github.io/learnhub/sims/mastery/`.
     If the context orchestrator relies on the Site URL for its own emails, leave it as is:
     learnhub sends its return address with every request, so the redirect list below is
     what it needs.
   - **Redirect URLs**, add each of these:
     - `https://clz4096.github.io/learnhub/sims/mastery/**`
     - `http://localhost:5173/**` (Vite dev server)
     - `http://127.0.0.1:4173/**` (local preview of the built site, `npm run preview`)
2. **Sign In / Providers**, under **Email**: make sure the email provider is enabled. Magic
   links need nothing else.
3. Leave **Allow new users to sign up** on for now: your first sign-in creates your user. You
   turn it off in step 7.

Supabase's built-in email sender delivers only to members of the project's organization and
sends a few emails an hour. That is enough for one learner on two devices. If a link does not
arrive, check spam, then wait before asking again.

## 4. Add the config file

1. In the dashboard, open **Project Settings**, then **API Keys** (on older dashboards,
   **API**). Copy the **Project URL** and the **anon** key (the newer **publishable** key,
   `sb_publishable_...`, also works).

   Never copy the **service_role** key or a **secret** key (`sb_secret_...`). Those bypass
   row-level security. The app refuses them and keeps sync off if one is pasted by mistake.
2. Create `sims/mastery/sync-config.json` from the example next to it:

   ```sh
   cp sims/mastery/sync-config.example.json sims/mastery/sync-config.json
   ```

3. Edit `sims/mastery/sync-config.json`: set `url` to the Project URL (for example
   `https://wloyfktbyjtwqdinohob.supabase.co`) and `anonKey` to the key. You can delete the
   `$comment` line.

The URL and anon key are public by design, so committing them is fine: row-level security
decides what a signed-in user may read and write.

## 5. Check locally, then publish

```sh
npm run typecheck
CI=1 npm test
npm run build
npm run preview -- --base /learnhub/
```

Open `http://127.0.0.1:4173/learnhub/sims/mastery/#/progress`. The **Sync between devices**
card should offer **Email me a sign-in link** instead of "not set up". If it still says not
set up, the text after it names the problem in the config file.

Then commit and push:

```sh
git add sims/mastery/sync-config.json
git commit -m "Switch on progress sync"
git push
```

Wait for the **Pages** workflow to finish.

## 6. Sign in on the Mac, then the phone

1. **Mac**: open `https://clz4096.github.io/learnhub/sims/mastery/`, go to **Progress**,
   enter your email, and select **Email me a sign-in link**. Open the link from the email
   **in the same browser**. The page returns to Progress and shows "Signed in as ...". The
   first sync uploads the Mac's progress.
2. **Phone**: open the same address. A phone with no progress shows the start screen, which
   now has the same **Sync between devices** card: sign in there (no need to choose a course
   first). Open the link **on the phone**. The phone downloads the Mac's progress and goes to
   Today.

From then on, each device syncs when it opens, a moment after each lesson, review, quiz, or
supervision import, and when it comes back online. **Sync now** forces a round.

## 7. Close sign-ups

Once both devices are signed in, open **Authentication**, **Sign In / Providers**, and turn
off **Allow new users to sign up**, so nobody else can create a user with the public anon key.
Your existing user keeps signing in. If the context orchestrator creates users of its own,
leave this on.

## How it behaves

- **Merging**: studying on both devices offline loses no work. Per topic, the newer review
  wins; history and supervision results are combined; a done redo stays done; settings and
  chosen courses take the most recent choice, field by field.
- **Start over** on a signed-in device erases the progress on every device at its next sync.
- **A damaged or newer-version copy on the server** is reported on the Progress page and not
  merged; nothing is sent over it. Progress on the device is unchanged.
- **Signing out** keeps the device's progress; it just stops syncing.
- **Export and import** of a progress file still work as a backup.

## Switching sync off again

Delete `sims/mastery/sync-config.json`, commit, and push. The table can stay; nothing reads it.
To remove the data too, run `drop table public.learnhub_progress;` in the SQL editor.

## Troubleshooting

| What you see | Likely cause |
| --- | --- |
| "Sign-in failed: Email link is invalid or has expired" | The link was used already, or is over an hour old. Ask for a new one. |
| The link opens the Supabase site URL instead of learnhub | The page address is missing from **Redirect URLs** (step 3). |
| "The learnhub_progress table may be missing" | Step 2 was not run on this project. |
| "Your sign-in has expired" | The device was signed out on the server. Sign in again. |
| "Too many sign-in emails for now" | The email rate limit. Wait, then try again. |
