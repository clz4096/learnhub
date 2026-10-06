# Switching on progress sync between devices

*Written 2026-10-05. Updated 2026-10-06: sync carries the campaign, story, day log, timed
ladder, mixed review, and timed-paper flags as well as progress; the table is unchanged.
Sign-in also takes the one-time code from the email, or an email and password set on a
signed-in device, for the iPhone Home Screen app (steps 3 and 6).*

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
3. **Emails** (on older dashboards, **Email Templates**): add the one-time code to the
   templates, so each sign-in email carries a code beside the link. The Home Screen app on
   the iPhone can sign in only with the code (see step 6).
   - Open **Magic Link** and add this line to the message body, below the link:

     ```html
     <p>Or enter this code in the app: <strong>{{ .Token }}</strong></p>
     ```

   - Add the same line to **Confirm signup**. Supabase sends that template instead of Magic
     Link the first time an address signs in, before its user exists.
   - Select **Save** on each.

   The app checks the code with `POST /auth/v1/verify` and `type: "email"`, the type GoTrue
   uses for every emailed code (`magiclink` is its older, deprecated name). Codes are six
   digits and last one hour by default (**Sign In / Providers**, **Email**, **Email OTP
   Expiration** and **Email OTP Length**); the app accepts 6 to 10 digits. Each new email
   replaces the previous code, and a code works once.
4. **Passwords** (optional, for the Home Screen app when the email has no code): the email
   provider allows password sign-in by default. Under **Sign In / Providers**, **Email**:
   - **Secure password change**: when on, Supabase refuses a password change from a sign-in
     that began more than a day ago (it wants a reauthentication code the app does not send).
     Either turn it off, or sign out and in again just before setting the password. The app
     says which when it happens.
   - **Minimum password length**: the app asks for at least 8 characters. If you raise the
     minimum here, the app reports Supabase's rule when a password is too short.
5. Leave **Allow new users to sign up** on for now: your first sign-in creates your user. You
   turn it off in step 7.

Supabase's built-in email sender delivers only to members of the project's organization and
sends a few emails an hour. That is enough for one learner on two devices. If an email does not
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
card should offer **Email me a sign-in link**, **Sign in with a password**, and **Or enter the
code from the email** instead of "not set up". If it still says not
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

3. **Phone, Home Screen app**: a Home Screen web app on iPhone keeps its own storage, apart
   from Safari's, and links in Mail always open in Safari. So the link signs in Safari, not
   the Home Screen app, which needs a password or the code. A password is simpler, and
   works when Supabase's built-in sender will not put the code in the email.

   **With a password (no email involved):**
   1. **Mac**, signed in: on **Progress**, under **Sync between devices**, open **Set a
      password for this account**. Enter a password of at least 8 characters twice and select
      **Set password**. Safari may offer to save it in Keychain; accept, and iCloud Keychain
      offers it on the phone too. The app keeps no copy of the password.
   2. On the phone, in Safari, open the address and select **Share**, then **Add to Home
      Screen**.
   3. Open learnhub from its Home Screen icon. The sync card (on Start, or on Progress) shows
      **Email** and **Password** first. Enter both (iOS may fill them from Keychain) and select
      **Sign in**. The app syncs at once and remembers the email for next time.

   If setting the password says Supabase wants a fresh sign-in, either turn off **Secure
   password change** (step 3.4), or sign out on the Mac, sign in again, and set the password
   straight away.

   **With the emailed code** (needs `{{ .Token }}` in the template, step 3.3):
   1. In Safari, open the address and select **Share**, then **Add to Home Screen**.
   2. Open learnhub from its Home Screen icon. The sync card says the link cannot sign in
      this app and offers the code below the password.
   3. Enter your email and select **Email me a code**.
   4. Open Mail, copy the six-digit code (iOS may offer it above the keyboard), and switch
      back. Do not open the link.
   5. Enter the code under **Enter the 6-digit code from the email** and select **Sign in
      with code**.

   If iOS reloaded the app while you were in Mail, the email box is empty again: type your
   email again and use the code you already have. A new email would replace it.

   Safari and the Home Screen app are two devices as far as sync is concerned. Each signs in
   once and both stay in step.

From then on, each device syncs when it opens, a moment after each lesson, review, quiz, or
supervision import, and when it comes back online. **Sync now** forces a round.

## 7. Close sign-ups

Once both devices are signed in, open **Authentication**, **Sign In / Providers**, and turn
off **Allow new users to sign up**, so nobody else can create a user with the public anon key.
Your existing user keeps signing in. If the context orchestrator creates users of its own,
leave this on.

## How it behaves

### What syncs

One row per learner holds the progress document and, beside its fields under the key
`learner`, a versioned envelope with everything else a learner does in the app:

| Part | Stored on the device as | What it holds |
| --- | --- | --- |
| Progress | IndexedDB | Topics, reviews, history, supervision, redos, settings, courses. |
| Campaign | `mastery.campaign.v1` | Route, college, A level order, TMUA sitting, sittings and their marks, interviews, letters. |
| Story | `mastery.story.v1` | Scenes seen (beats and side scenes included), choices, REP, the queue. |
| Day log | `mastery.day.v1` | Each day's wake time, ticked blocks, and replans (last 21 days). |
| Timed ladder | `mastery.ladder.v1` | Attempts and their marks. |
| Mixed review | `mastery.mixed.v1` | The day's blind mixed review: its plan and place. |
| Timed-paper flags | `mastery.flags.v1` | Parts flagged during the running sitting or attempt. |

The device keeps its copy of the envelope in `mastery.learner.v1`, updated on each save so
every change is dated when it was made.

These stay on each device on purpose, as conveniences of one screen: the theme
(`mastery.theme.v1`), the fold of the whole day on Today (`mastery.wholeday.v1`), the map's
"all edges" switch, the palette's recent items (`mastery.recent.v1`), whether the tour has
played (`mastery.tour.v1`), the last email used to sign in (`mastery.syncemail.v1`; never the
password), a lesson's place within a tab (sessionStorage), and the catalog
summary (`learnhub.progress.mastery`), which is rebuilt from progress.

### Merging

Studying on both devices offline loses no work. Every rule below gives the same result
whatever order the copies meet in.

- **Progress**: per topic, the newer review wins; history and supervision results are
  combined; a done redo stays done; settings and chosen courses take the most recent choice,
  field by field.
- **Campaign choices** (route, college, A level order, TMUA sitting, application filed): the
  most recent choice, field by field.
- **Sittings, interviews, ladder attempts**: combined by id. A finished copy beats a running
  one; the most recently entered marks win. An interview removed or an attempt discarded on
  one device is removed on every device.
- **Story**: scenes seen on either device count as seen; at each choice point the most
  recent choice wins, and relationships follow from the choices.
- **Day log**: each day's most recent wake time wins. Blocks ticked on either device stay
  ticked, and an untick wins over an earlier tick. Changing the wake time clears that day's
  ticks, as it does on one device.
- **Mixed review**: the later day wins; on the same day, the later plan, then the copy
  further through it. A day finished on either device stays finished.
- **Flags**: the later-started sitting's flags; for the same sitting, flags from both devices.
- **Running clocks**: one paper or rung runs at a time on a device, and the Paper and Ladder
  screens refuse to start one while another runs. If both devices start one offline, both are
  kept after the merge, both running; the earlier shows first, and the other's clock has run
  on meanwhile, so it reads as over time.

### Other behaviour

- **Start over** on a signed-in device erases the progress on every device at its next sync.
  It does not erase the campaign, story, day log, or timed work, on this device or others.
- **Older builds** (a phone still running a cached copy) read the row's progress and ignore
  the envelope. When such a build pushes, the row loses the envelope until a current build
  syncs again and puts it back; nothing is lost, since each device keeps its own copy.
- **A damaged or newer-version copy on the server**, progress or envelope, is reported on the
  Progress page and not merged; nothing is sent over it. Nothing on the device is changed.
- **Signing out** keeps the device's progress; it just stops syncing.
- **Export and import** of a progress file still work as a backup. The file carries the
  envelope too, and importing it replaces both. A file exported by an older build holds
  progress only; importing it replaces progress and leaves the rest as it is.

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
| "That code is not right" | A typo, or an older email's code: each new email replaces the code. Use the newest email. |
| "That code has expired" | The code is over an hour old. Send a new email. |
| "That code is wrong or has expired" | The app was reloaded since the email was sent, so it cannot tell which. Check the newest email, or send a new one. |
| "Too many tries for now" | Supabase's limit on code checks. Wait a few minutes. |
| The email has a link but no code | `{{ .Token }}` is missing from the template that sent it (step 3): Magic Link, or Confirm signup for a first sign-in. |
| The link opened Safari and the Home Screen app is still signed out | Expected: use a password or the code in the Home Screen app (step 6). |
| "Wrong email or password" | A typo, or no password set for this email yet. Set one on a signed-in device (step 6). |
| "Too many sign-in attempts for now" | Supabase's limit on password sign-ins. Wait a few minutes. |
| "Supabase wants a fresh sign-in first" | **Secure password change** is on and the sign-in is over a day old. Turn it off (step 3.4), or sign out, sign in, and set the password at once. |
| "That password is too weak" | Shorter than the project's **Minimum password length**, or missing characters it requires. |
