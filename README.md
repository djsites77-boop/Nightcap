# Nightcap

Short-term rental compliance tracker for Canadian STR hosts — night-cap counter, MAT (Municipal
Accommodation Tax) ledger, registration renewal tracking, and an inspection checklist. Toronto-first,
architected so adding another Canadian municipality is a data-entry task, not a code change.

See [`NIGHTCAP_BUILD_SPEC.md`](./NIGHTCAP_BUILD_SPEC.md) for the full product/data-model spec and
[`design/nightcap-prototype.html`](./design/nightcap-prototype.html) for the original static design
reference (superseded by the real app below).

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · Radix UI primitives ·
Prisma 7 + Postgres 16 · Better Auth · Vitest.

## Prerequisites

- Node.js 20.9+ (Next.js 16's minimum)
- [pnpm](https://pnpm.io/installation): `npm install -g pnpm`
- Postgres, one of:
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended — see `docker-compose.yml`)
  - a local Postgres 16 install

## Quick start (Windows / PowerShell)

```powershell
git clone https://github.com/djsites77-boop/nightcap.git
cd nightcap
git checkout claude/code-review-vej32n
.\scripts\start-dev.ps1 -Seed
```

Prefer everything running in its own visible window (Postgres logs, the Next.js app, optionally
Prisma Studio) instead of one shared console? Use `start-servers.ps1` instead — same setup steps,
but each server gets its own named window (`Nightcap - Postgres`, `Nightcap - Next.js App`, ...):

```powershell
.\scripts\start-servers.ps1 -Seed          # add -WithStudio for a Prisma Studio window too
.\scripts\stop-servers.ps1                 # closes those windows and stops Postgres
```

This copies `.env.example` to `.env` if missing, installs dependencies, starts Postgres in Docker on
host port **4500**, runs migrations, seeds demo data, and starts the app on **http://localhost:3500**.

Stop Postgres afterward with `.\scripts\stop-dev.ps1` (add `-Wipe` to also delete its data volume).

## Quick start (macOS / Linux)

```bash
git clone https://github.com/djsites77-boop/nightcap.git
cd nightcap
git checkout claude/code-review-vej32n
cp .env.example .env   # edit DATABASE_URL/secrets if not using the Docker default
pnpm install
docker compose up -d db
pnpm exec prisma migrate deploy
pnpm db:seed            # optional — demo accounts + sample properties
pnpm dev                # http://localhost:3500
```

## Demo accounts (after `pnpm db:seed`)

| Role | Email | Password |
|---|---|---|
| Host | `dana@queensthosting.ca` | `nightcap-demo-2026` |
| Platform admin | `admin@nightcap.app` | `nightcap-admin-2026` |

The host account has 4 seeded Toronto properties tuned to hit every compliance status (OK, WARNING,
RISK) and a sync-error state, so the dashboard has something real to look at immediately. The admin
account can manage users/tiers and jurisdiction compliance rules at `/admin`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server on port 3500 |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm test` | Run the Vitest suite (compliance logic, CSV import, crypto) |
| `pnpm db:migrate` | `prisma migrate dev` — create/apply a migration |
| `pnpm db:seed` | Seed demo municipalities, rules, users, properties |
| `pnpm db:studio` | Prisma Studio (browse the DB) |
| `pnpm ical:sync` | Run the iCal polling sync once, for all connections (self-hosted cron target) |

## Environment variables

See `.env.example` for the full list with inline comments. Everything needed to run the app locally
has a working default. Three groups need **your own** real credentials before they do anything —
each is honestly non-functional without them, not silently faked:

- **`HOSPITABLE_CLIENT_ID`/`SECRET`, `GUESTY_CLIENT_ID`/`SECRET`** — Tier 1 PMS OAuth (spec §5b). The
  OAuth flow (`/api/pms/[provider]/connect` and `/callback`) is fully implemented against each
  platform's documented Authorization Code flow, but untested against a real account — **[VERIFY]**
  the authorize/token URLs in `src/lib/pms/config.ts` against current developer docs before relying
  on it.
- **`ANTHROPIC_API_KEY`** — enables AI-assisted compliance-rule extraction in the admin panel
  (`/admin/rules/[id]`, "Suggest from bylaw text"). Always proposes a value into the form for human
  review; nothing is ever saved without an admin explicitly submitting it.
- **`DOCUMENT_STORAGE_DRIVER=s3`** plus AWS credentials — swaps document storage from local disk to a
  real S3/R2 bucket with presigned URLs for production. Local disk (the default) is dev-only.

Background jobs (iCal sync) run via a cron trigger rather than a queue — `CRON_SECRET` protects
`/api/cron/sync-calendars`; point your platform's scheduler (Vercel Cron, a hosted cron job, etc.) at
it with `Authorization: Bearer <CRON_SECRET>` every 6–12 hours, or run `pnpm ical:sync` from your own
system cron.

## What's genuinely not wired up yet

Flagged here rather than left to discover:

- **No payment collection.** Subscription tiers (`Free`/`Starter`/`Growth`/`Portfolio`) are modeled
  and enforced (property-count limits, admin-set tier), but there's no Stripe/checkout integration —
  tier changes are admin-only for now (`/admin/users`, `setUserTier` in `app/actions/admin.ts`). Wiring
  up self-serve billing means adding Stripe Checkout + webhooks that call the same function.
- **No transactional email.** Registration renewal/MAT-due reminders from the spec's MVP scope
  (§10) aren't sent — there's no email provider configured.
- **Address-based jurisdiction "auto-suggest"** on Add Property is a simple name-match against
  active municipalities, not real geocoding — the explicit picker is still the source of truth.
- **Hospitable/Guesty and Anthropic integrations** need real credentials, as above.

## Architecture notes worth knowing before extending this

- **Rules engine (spec §2):** compliance thresholds live in `ComplianceRule` rows
  (`municipality × rule_type × unit_type × effective_date`), resolved by
  `src/lib/compliance/rules.ts` — never hardcoded per-city branches. Adding a municipality is an
  `/admin/rules` data-entry task.
- **Per-night attribution (spec §6a):** a booking crossing a calendar-year or MAT-period boundary is
  split night-by-night, not counted whole toward either period —
  `src/lib/compliance/night-attribution.ts` and `mat-attribution.ts`, both unit-tested against the
  Dec 29–Jan 4 boundary case.
- **iCal sync safety (spec §5a, fix #4):** a feed returning zero events is never trusted as "every
  booking cancelled" — `src/lib/ical-sync.ts` requires absence across two consecutive successful
  syncs before confirming a cancellation.
- **Encryption:** `CalendarConnection.icalUrlCiphertext` and PMS OAuth tokens are AES-256-GCM
  encrypted at rest (`src/lib/crypto.ts`) — never stored or displayed in full after initial entry.
- **Documents:** served via short-lived signed URLs (`src/lib/storage/`), not public links — a local
  HMAC-signed-URL driver in dev, swappable for real S3 presigned URLs in production.
