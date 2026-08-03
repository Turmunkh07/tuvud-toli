# Төвөд-Монгол толь

A lightweight, minimalist academic **Tibetan → Mongolian** dictionary. Each entry is a Tibetan term with one or more Cyrillic definitions, every definition carrying its academic source. Includes a small admin CMS with bulk .xlsx import. Built to run entirely on free tiers ($0/month).

## Data model

| Table          | Shape                                                                     |
| -------------- | -------------------------------------------------------------------------- |
| `words`        | `term_tibetan` (the headword), `term_key` (normalised, for merging)         |
| `sources`      | `title` (a book/dictionary/paper), `title_key` (normalised, for merging)    |
| `definitions`  | belongs to a word and a source: `definition_text`, `meaning_number`         |
| `activity_log` | who changed what, when                                                     |

`definitions.definition_text_lower` is a lowercased mirror of the definition, written automatically on every insert. SQLite's `LIKE` only case-folds ASCII, so searching Cyrillic would otherwise be case-sensitive — searches run against this column instead.

## Inviting collaborators

An admin can invite someone from the dashboard by name and email. The system generates a random password, stores only its scrypt digest, and emails the plaintext once — so inviting a collaborator no longer means editing `ADMIN_USERS` and redeploying. Invited collaborators log in with their **email**; `ADMIN_USERS` entries log in with their **name**, and that env path stays live as a bootstrap so an empty or broken `admins` table can never lock everyone out.

Set `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` (SMTP2GO's free tier is enough — a handful of invites a year sits far inside 1,000/month) plus `APP_URL` for the link in the email. **Without SMTP configured the invite still creates the account and shows you the generated password to pass on by hand**, rather than reporting success for mail that never left. That fallback puts the password in a URL and therefore in browser history, so configure SMTP before using this in earnest.

**Removing** a collaborator is restricted to the accounts listed in `OWNER_IDENTIFIERS` (comma-separated, matched case-insensitively against either an `ADMIN_USERS` name or a collaborator's login email). Everyone else can still invite and edit entries. The check runs inside the server action, not just by hiding the button, since the action is reachable directly. If `OWNER_IDENTIFIERS` is blank, only `ADMIN_USERS` accounts qualify — defaulting to "everyone" would silently void the restriction if the variable went missing.

The password is emailed in plaintext by request. It's recoverable only at invite time; to replace a lost one, remove the collaborator and invite them again.

**Removal is instant, not just for future logins.** A session cookie is a signed JWT — cryptographically valid for up to 7 days regardless of what happens to the account afterward, so checking only the token would let a just-removed collaborator keep working until it expired. `proxy.ts` re-checks every `/admin/*` request against the database (`lib/session-validity.ts`) and clears the cookie the moment the account is gone; `lib/dal.ts` repeats the same check as an independent backstop close to the data itself. This is one of the few database reads Proxy does — Next's own docs advise against that for latency at scale, but it's also the only layer allowed to clear a cookie on its response, which is what stops a removed collaborator's browser from looping between `/admin` and `/admin/login`. At this app's scale the extra read is immaterial.

## Admin login throttling

Failed logins are recorded in `login_attempts` and an IP is locked out after **8 failures in 15 minutes**. The check runs before credentials are read, so a locked-out client cannot use the endpoint as a password oracle — the correct password is refused too. A successful login clears that IP's counter, and expired rows are deleted opportunistically on each check, so no cron job is needed.

Throttling is keyed on IP, not username, deliberately: locking a username would let anyone lock a real admin out of their own dictionary by guessing at it. The trade-off is that an attacker with many IPs is not stopped by this alone — it raises the cost of casual guessing and is not a substitute for strong passwords.

State lives in the database rather than in memory because serverless instances don't share memory and are recycled constantly; an in-process counter would silently reset itself.

## Bulk import

The admin dashboard links to a blank template (**Загвар файл татах**), generated on demand at `/admin/template` rather than committed as a binary, so its columns can never drift from the parser. It ships header-only on purpose — a sample data row would be imported verbatim by anyone who filled the sheet in without deleting it first.

The importer accepts an `.xlsx` whose first sheet has exactly three columns:

| Column | Contents                    |
| ------ | --------------------------- |
| A      | Source                      |
| B      | Tibetan word                |
| C      | Definition (Cyrillic)       |

### Merging one word across many books

Each collaborator imports their own book. Definitions accumulate on the word rather than replacing it, so a headword ends up carrying every source that defines it, and the word page groups them under each source heading.

Merging words is decided by `words.term_key`, a normalised form of the headword (see `lib/tibetan.ts`): NFC-composed, whitespace removed, trailing tsheg `་` and shad `།` stripped. Without it, one scholar typing `ཆོས་` and another typing `ཆོས` would produce two separate entries for the same word — which, across ten books typed by ten people, would happen constantly. The original spelling is preserved for display; only the key is normalised. Adding a word by hand that already exists appends to it under the same rule.

**Sources are a table, not free text** (`sources`, joined via `definitions.source_id`). The source column on each import row is resolved against it — same name (case/whitespace-insensitive) reuses the existing source; an unfamiliar name creates one. This is what actually removes the old failure mode, where a book cited inconsistently across rows split into apparent duplicate sources: now the same wording, however it drifts between rows or between collaborators' files, lands in one place. Manual entry in the CMS offers existing source titles as autocomplete suggestions (an HTML `<datalist>`) for the same reason, though typing something new is always allowed.

`/admin/sources` lists every source with its definition count. **Rename** fixes a source that still ended up inconsistent (typo, abbreviation) — renaming onto a title that already exists merges the two rather than erroring. **Merge** lets you fold one source into another explicitly. Both reassign every affected definition; a source can only be deleted once nothing references it.

A first row without Tibetan characters in column B is treated as a header and skipped. Rows missing any of the three columns are skipped and reported. Rows sharing the same Tibetan word become multiple definitions on a single entry, and if that word already exists in the database the new definitions are appended to it rather than creating a duplicate.

Uploads are capped at 4MB (`serverActions.bodySizeLimit` in `next.config.ts`, kept under Vercel's 4.5MB request limit).

## Stack

- **Next.js** (App Router, TypeScript) + **Tailwind CSS**
- **Turso** (LibSQL / serverless SQLite) + **Drizzle ORM**
- **Vercel** for hosting
- Session auth via signed JWT cookies (`jose`), no external auth service

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in real values:

   ```bash
   cp .env.example .env.local
   ```

   - `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — from `turso db show <db>` and `turso db tokens create <db>` (see [turso.tech](https://turso.tech)).
   - `ADMIN_USERS` — JSON array of admins, e.g. `[{"name":"Alice","password":"..."}]`. Each admin's actions are attributed by name in the activity log.
   - `AUTH_SECRET` — random signing key for session cookies: `openssl rand -base64 32`.

3. Push the schema to your database:

   ```bash
   npm run db:push
   ```

   > **Read the plan before confirming.** SQLite cannot alter a column in place, so
   > some changes — notably making a nullable column `NOT NULL` — are executed by
   > drizzle-kit as `delete from <table>` followed by a table rebuild. It prints the
   > statements first; if you see a `delete from`, it means every row in that table
   > is about to be destroyed. Once there is real data, back it up first and prefer
   > `npm run db:generate` plus a hand-edited migration over `db:push --force`.

4. Seed sample data (optional, 8 sample entries):

   ```bash
   npm run seed
   ```

5. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) for the public search, [http://localhost:3000/admin](http://localhost:3000/admin) for the CMS.

## Scripts

| Script             | Purpose                                    |
| ------------------ | ------------------------------------------- |
| `npm run dev`       | Local dev server                            |
| `npm run build`     | Production build                            |
| `npm run start`     | Run a production build locally              |
| `npm run seed`      | Seed sample dictionary entries              |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:push`   | Push the current schema straight to the database |
| `npm run db:studio` | Open Drizzle Studio to browse the database  |

## Deploying to Vercel

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In Vercel, "Add New Project" and import the repo — Vercel auto-detects Next.js, no config needed.
3. In the project's **Settings → Environment Variables**, add: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_USERS`, `AUTH_SECRET`. Use real, non-dev values (rotate the local dev admin password before adding it here).
4. Deploy. Every push to the main branch redeploys automatically.
5. Run `npm run db:push` locally (pointed at the same Turso database) whenever the schema changes — there's no build-time migration step, so schema changes must be pushed before the code that depends on them goes live.

Everything here fits inside Vercel's free tier and Turso's free tier (5GB storage) with no server to manage.
