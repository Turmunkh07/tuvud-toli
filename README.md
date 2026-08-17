# Төвөд-Монгол толь

A lightweight, minimalist academic **Tibetan → Mongolian** dictionary. Each entry is a Tibetan term with one or more Cyrillic definitions, every definition carrying its academic source. Includes a small admin CMS with bulk .xlsx import. Built to run entirely on free tiers ($0/month).

## Data model

| Table          | Shape                                                                     |
| -------------- | -------------------------------------------------------------------------- |
| `words`        | `term_tibetan` (the headword), `term_key` (normalised, for merging)         |
| `sources`      | `title` (a book/dictionary/paper), `title_key` (normalised, for merging)    |
| `definitions`  | belongs to a word and a source: `definition_text`, `meaning_number`         |
| `activity_log` | who changed what, when; `file_name` for imports                             |

`definitions.definition_text_lower` is a lowercased mirror of the definition, written automatically on every insert. SQLite's `LIKE` only case-folds ASCII, so searching Cyrillic would otherwise be case-sensitive — searches run against this column instead.

## Inviting collaborators

An admin can invite someone from the dashboard by name and email. The system generates a random password, stores only its scrypt digest, and emails the plaintext once — so inviting a collaborator no longer means editing `ADMIN_USERS` and redeploying. Invited collaborators log in with their **email**; `ADMIN_USERS` entries log in with their **name**, and that env path stays live as a bootstrap so an empty or broken `admins` table can never lock everyone out.

Set `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` (SMTP2GO's free tier is enough — a handful of invites a year sits far inside 1,000/month) plus `APP_URL` for the link in the email. **Without SMTP configured the invite still creates the account and shows you the generated password to pass on by hand**, rather than reporting success for mail that never left. That fallback puts the password in a URL and therefore in browser history, so configure SMTP before using this in earnest.

**Removing** a collaborator is restricted to the accounts listed in `OWNER_IDENTIFIERS` (comma-separated, matched case-insensitively against either an `ADMIN_USERS` name or a collaborator's login email). Everyone else can still invite and edit entries. The check runs inside the server action, not just by hiding the button, since the action is reachable directly. If `OWNER_IDENTIFIERS` is blank, only `ADMIN_USERS` accounts qualify — defaulting to "everyone" would silently void the restriction if the variable went missing.

The password is emailed in plaintext by request. It's recoverable only at invite time; to replace a lost one, remove the collaborator and invite them again.

**Removal is instant, not just for future logins.** A session cookie is a signed JWT — cryptographically valid for up to 7 days regardless of what happens to the account afterward, so checking only the token would let a just-removed collaborator keep working until it expired. `proxy.ts` re-checks every `/admin/*` request against the database (`lib/session-validity.ts`) and clears the cookie the moment the account is gone; `lib/dal.ts` repeats the same check as an independent backstop close to the data itself. This is one of the few database reads Proxy does — Next's own docs advise against that for latency at scale, but it's also the only layer allowed to clear a cookie on its response, which is what stops a removed collaborator's browser from looping between `/admin` and `/admin/login`. At this app's scale the extra read is immaterial.

## Changing the schema (read this first)

**Never run `drizzle-kit push --force`.** Its own help text describes `--force` as *"auto-approve all data loss statements... may truncate your tables and data"*. On SQLite, adding a `NOT NULL` column forces drizzle-kit to rebuild the table, and it gets there by emitting `delete from <table>`. During development that silently emptied `words` twice. There is no npm script for it any more.

Use instead:

| Command | Purpose |
| ------- | ------- |
| `npm run db:migrate` | The only sanctioned way to change the schema. Refuses destructive changes, backs up, applies, verifies row counts. |
| `npm run db:plan` | Show what a migration would do, changing nothing. |
| `npm run db:backup` | Timestamped JSON dump of every table into `backups/` (git-ignored). |
| `npm run db:restore -- <file>` | Dry run; add `--confirm` to actually write. |

`db:migrate` compares `schema.ts` against the live database and refuses two shapes before touching anything:

1. a new `NOT NULL` column on a table that already holds rows
2. a column or table that would be dropped while still holding data

It does not parse drizzle-kit's output — that renders through a TUI which yields nothing usable when piped — it inspects the schema directly, so the check cannot be defeated by a formatting change. Whatever it does allow, it backs up first and compares row counts afterwards, telling you the exact restore command if anything disappeared.

`--allow-data-loss` exists for deliberate removals. It still backs up, still reports what was lost, and still exits non-zero.

**When adding a column, make it nullable.** Treat null as the default in code, or backfill every row and tighten later. Every derived column here (`term_key`, `sort_key`, `source_id`, `source_file`) is nullable for exactly this reason.

## Alphabetical order

Words are filed and sorted by their **མིང་གཞི་ (root letter)**, the way a Tibetan dictionary orders them — not by first written character. `བཀྲ་ཤིས་` belongs under ཀ even though it is spelled starting with བ, because the བ is a prefix. `lib/tibetan.ts` parses a syllable into stacks and applies the orthography: prefixes (ག ད བ མ འ) stand beside the root, superscripts (ར ལ ས) are written above it with the root subjoined beneath, and subscripts (ya/ra/la/wa btags) hang below without displacing it. A written vowel settles which stack is the root outright.

`words.root_letter` and `words.sort_key` are stored, not derived per query, so browsing a letter is an indexed lookup. Write them together via `wordIndexFields()` — a word with a stale sort key files itself under the wrong letter silently.

Known limit: a two-letter syllable with no written vowel (`གད`) is ambiguous in the script itself, readable as root+suffix or prefix+root; the far commoner root+suffix reading is taken.

## Backup and export

`/admin/export` downloads the whole dictionary in exactly the three-column shape the importer accepts, so an export can be fed straight back in — verified by round-tripping one through the importer, which reported every row as a duplicate and changed nothing. This is the only safeguard against the corpus being trapped in a single hosted database, so take one periodically.

## Word views

Opening a public entry increments `words.view_count` from `after()`, so the write happens once the response is already sent and a failed counter can never break a page or slow a reader down.

The landing page shows **recently added** until at least 10 words have passed 100 views each, then switches to **most looked up** (`lib/views.ts`). Both thresholds exist so a handful of early clicks cannot masquerade as popularity on a dictionary nobody has read yet.

## Citations

Each source block on a word page offers a copy button in Mongolian and in English. Both produce the standard form for a reference-work entry — the work, then `s.v.` (*sub verbo*, "under the word") with the headword, then this dictionary and an access date and URL. `s.v.` is language-neutral, so the two variants differ only in their surrounding words. The Mongolian access date is formatted numerically rather than via `toLocaleDateString("mn-MN")`, because browsers routinely lack Mongolian locale data and silently fall back to English month names.

## Edit history

Updating or deleting a word snapshots it and all its definitions into `word_revisions` first, because deletion cascades and would otherwise be unrecoverable. `/admin/history` lists them with a restore button, and each entry records **which workbook the definitions came from** so you know which spreadsheet to go back to — cross-referenced with `/admin/imports` for who uploaded it and when.

Deleting a word never touches the xlsx itself: those files are only ever uploaded, never stored, so only database rows are removed.

**Words entered by hand are not archived** — with no spreadsheet to point back at, they are deleted outright by request. That means manual entries have no undo, which is worth knowing before deleting one.

Restoring is itself snapshotted, so an unwanted restore can be undone in turn; restoring a deleted word recreates it under a new id, since the original row is gone.

## Per-source entries

`/admin/sources/<id>` lists everything one book contributed, in dictionary order — the view a contributor uses to check their own import landed as intended, and the one that answers how far a source actually covers.

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

`/admin/imports` lists recent xlsx imports — who ran it, the original filename (its own `activity_log.file_name` column, so it can be filtered and sorted on), and its result — so it's answerable after the fact which admin contributed which book, without reviving a general activity feed on the dashboard. The list is capped at the most recent 100 and says so when capped, because `activity_log` grows with every admin action app-wide, not just imports; an index on `(action, id)` keeps the query off a full table scan. Deleting a word removes its definitions but currently leaves behind any source row that import created if nothing else references it; harmless clutter, clearable by hand from `/admin/sources`.

### Conflicting definitions

A source may legitimately define a word several times — those are separate senses, and rows arriving together in one workbook are all accepted. What is not legitimate is a *later* import asserting different wording for a (word, source) pair another file already covered: one of the two contributors misread the book, and keeping both would leave the entry claiming one source says two different things.

Those rows are **quarantined in `definition_conflicts` rather than written into `definitions`**, so the dictionary never publishes two rival texts attributed to one source. `/admin/conflicts` shows each one side by side — existing vs incoming, who contributed each, which file — and keeping either resolves it (keeping the incoming text overwrites the definition in place rather than adding a second one). A pending count appears in red on the dashboard. Re-uploading a file whose rows are already recorded is a no-op, reported as `давхардсан`, not a conflict.

One email goes out **per import, never per word** — a workbook clashing on three hundred rows would otherwise mean three hundred emails. It reaches the admin who uploaded and every email in `OWNER_IDENTIFIERS`, and nobody else: whoever contributed the wording being contradicted is deliberately not copied, so they aren't pulled into every clash someone else's spreadsheet causes — the owner tells them if the decision affects their work. An uploader who is themselves an owner gets one message, not two. `ADMIN_USERS` accounts have no email address, so an import by one of those notifies the owners only. A send failure is swallowed, since the conflicts are already recorded and the page shows the same information.

`definitions.source_file` and `definitions.created_by` record where each definition came from, shown per row on the word edit form. They're deliberately not on the public word page — a reader has no use for an internal spreadsheet filename.

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

3. Create the schema:

   ```bash
   npm run db:migrate
   ```

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
| `npm run db:migrate` | Apply schema changes safely (refuses data loss, backs up first) |
| `npm run db:backup` | Dump every table to `backups/` |
| `npm run db:restore -- <file>` | Restore a dump (`--confirm` to write) |
| `npm run db:studio` | Open Drizzle Studio to browse the database  |

## Deploying to Vercel

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In Vercel, "Add New Project" and import the repo — Vercel auto-detects Next.js, no config needed.
3. In the project's **Settings → Environment Variables**, add: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_USERS`, `AUTH_SECRET`. Use real, non-dev values (rotate the local dev admin password before adding it here).
4. Deploy. Every push to the main branch redeploys automatically.
5. Run `npm run db:migrate` locally (pointed at the same Turso database) whenever the schema changes — there's no build-time migration step, so schema changes must be applied before the code that depends on them goes live. See **Changing the schema** above; never use `drizzle-kit push --force`.

Everything here fits inside Vercel's free tier and Turso's free tier (5GB storage) with no server to manage.
