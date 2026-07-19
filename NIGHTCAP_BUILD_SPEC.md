# Nightcap — Build Spec

**Product:** Short-term rental compliance tracker for Canadian STR hosts, launching Toronto-first.
**This document is a build spec for Claude Code.** It defines scope, data model, rules engine, and
integrations. Where a fact could not be verified against a primary source at spec-writing time, it is
flagged **[VERIFY]** — do not hardcode these; confirm against the cited source or the City's current
published bylaw before implementing, and store them as configurable rule data, not literals in code.

---

## Revision notes (v2)

This revision closes six gaps found in a review of v1, before any code is written against it:

1. **§5a / §6a (new)** — bookings that cross a calendar-year or MAT-period boundary had no
   attribution rule. Added an explicit per-night split algorithm.
2. **§3 / §6** — the partial-unit bedroom cap ("max 3, one fewer than total bedrooms") referenced a
   `bedroom_count` that didn't exist on `Property`. Added `bedroom_count` and `rooms_offered` fields
   and a static compliance check.
3. **§3 / §6** — the `occupancy_limit` rule type had no data source (iCal gives dates only, no guest
   count) and so could never actually be evaluated. Marked it explicitly non-enforced in MVP instead
   of silently modeling a check that can't run.
4. **§5a** — "a booking that disappears on re-sync = cancelled" would misfire on a failed/truncated
   fetch, silently deleting real bookings from the night tally. Added a debounce + empty-feed guard.
5. **§3 / §12 (new)** — `CalendarConnection.ical_url` and `Document.file_url` had no storage/security
   treatment; both are sensitive. Added explicit requirements.
6. **§3** — `ComplianceRule` had no uniqueness constraint, so two conflicting rules could share an
   effective date. Added the constraint.

---

## 1. Problem & positioning

Toronto STR hosts operating an entire-home listing must track an annual 180-night cap, remit a 6%
Municipal Accommodation Tax (MAT), keep a registration current, and hold inspection-readiness
documentation. No free tool does this for Canadian hosts today. Airbnb enforces the cap on the
backend but gives hosts no dashboard. A comparable US product (RentPermit.com — night-cap counter,
iCal import, licence/cert expiry tracking, multi-listing dashboard) exists for US cities only, not
Canada. This spec is for a Canadian-first equivalent, Toronto at launch, architected to add other
Canadian municipalities without a rebuild.

**Non-goal for v1:** guest-facing booking, payments, or property management (cleaning, messaging).
This is a compliance dashboard only.

---

## 2. Rules engine — the part that must NOT be hardcoded

Every municipality has different thresholds. Toronto's current published rules **[VERIFY against
toronto.ca/city-government/data-research-maps/toronto-municipal-code/ and Chapter 547 directly before
launch — bylaws are amended]**:

| Rule | Toronto value at spec time | Source status |
|---|---|---|
| Annual night cap, entire-home | 180 nights/calendar year (Jan 1–Dec 31) | [VERIFY] |
| Partial-unit / room rentals | No annual cap; max 3 bedrooms rented simultaneously, one fewer than total bedroom count | [VERIFY] |
| Principal residence requirement | STR must be host's principal residence | [VERIFY] |
| Municipal Accommodation Tax (MAT) | 8.5% Jun 1 2025–Jul 31 2026 (else 6%) | Verified 2026-07-19 vs City Good Operator Guide; seeded as dated ComplianceRule rows |
| Registration | Required per unit; non-refundable annual fee (~$53.22 at spec time) | [VERIFY, fee changes] |
| Occupancy | Max 2 adults per bedroom | [VERIFY] — **and see §6b: not enforceable in MVP regardless of the figure's accuracy, since no guest-count data source exists yet** |
| Record retention | Booking logs retained 3 years | [VERIFY] |
| Fines | Up to $100,000 per offence under Chapter 547 | [VERIFY] |

**Architecture requirement:** model these as rows in a `compliance_rules` table keyed by
`(municipality_id, rule_type, effective_date)`, not as application constants. This is what makes
"add Vancouver" or "add Montréal" a data-entry task instead of a code change, and it's the actual
moat referenced in the business case — do not shortcut this with an `if city === 'toronto'` branch
anywhere in the codebase.

---

## 3. Data model

```
User
  id, name, email, password_hash, created_at

Municipality
  id, name, province, active (bool)

ComplianceRule
  id, municipality_id (FK), rule_type (enum: night_cap, mat_rate, registration_fee,
    occupancy_limit, record_retention_years), unit_type (enum: entire_home, partial_unit, all),
    value (numeric or JSON for compound rules), effective_date, source_url, verified_at
  UNIQUE (municipality_id, rule_type, unit_type, effective_date)
    -- v1 had no such constraint: two rules could silently share an effective date, making
    -- "the current rule" ambiguous. "Current rule" is always the row with the latest
    -- effective_date <= the date being evaluated, so a duplicate must be rejected at write time,
    -- not caught later at read time.

Property
  id, user_id (FK), nickname, address, municipality_id (FK), unit_type (enum: entire_home, partial_unit),
  bedroom_count (int),
    -- NEW: v1's partial-unit rule ("max 3 bedrooms, one fewer than total") had no field to check
    -- it against. Required for any property; drives the rooms_offered cap below.
  rooms_offered (int, nullable, required when unit_type = partial_unit),
    -- NEW: number of bedrooms the host has configured for STR under a partial-unit listing.
    -- This is a declared configuration value, not a live guest count — see §6 for why that
    -- scoping is deliberate, not a shortcut.
  registration_number, registration_status (enum: not_registered, pending, active, expired),
  registration_issue_date, registration_expiry_date, created_at, archived_at (nullable)

CalendarConnection
  id, property_id (FK), platform (enum: airbnb, vrbo, direct),
  ical_url (encrypted at rest — see §12), last_synced_at,
  sync_status (enum: connected, error, disconnected), last_error (nullable),
  consecutive_empty_fetches (int, default 0)
    -- NEW: see §5a fix — used to debounce a false "all bookings cancelled" read.

Booking
  id, property_id (FK), calendar_connection_id (FK, nullable for manual entries),
  check_in, check_out, nights (int), platform, gross_amount (nullable — see §5),
  source (enum: ical_import, manual), external_uid (from ICS UID, for de-dupe), created_at

NightTally  (materialized/derived, recomputed on booking change — do not hand-maintain)
  property_id, calendar_year, nights_used, cap, last_computed_at
    -- nights_used is a sum of per-night attributions, not of whole-booking `nights` values —
    -- see §6a for why a boundary-crossing booking must be split before summing.

MatPeriod
  id, property_id (FK), period_start, period_end, gross_revenue, rate_applied,
  amount_owed, status (enum: due, remitted), remitted_at (nullable), remitted_by (user_id)
    -- gross_revenue is likewise a sum of per-night-prorated attributions for any booking that
    -- crosses into the adjacent period — see §6a.

InspectionItem
  id, property_id (FK), item_key (enum: smoke_detector, co_detector, egress, occupancy_posting —
    extensible per municipality via ComplianceRule, not hardcoded to Toronto's 4 items),
  completed (bool), completed_at, completed_by

Document
  id, property_id (FK), doc_type (enum: fire_safety_cert, insurance, floor_plan, other),
  file_url (private object storage key, not a public URL — see §12), uploaded_at, expiry_date (nullable)

AuditLog
  id, user_id, property_id, action, payload_json, created_at
```

**Why an AuditLog:** if the City ever audits a host, "prove you tracked this" is the product's actual
value proposition. Every mutation to registration, MAT remittance, and checklist state should be
append-only logged, not just updated in place.

---

## 4. Core user flows (see clickable mockup for exact screens/copy: `nightcap-prototype.html`)

1. **Sign up** → account created
2. **Add property** → nickname, address, municipality (Toronto only enabled at launch; others
   disabled with "coming soon" — do not build UI that implies unsupported cities work), unit type,
   bedroom count, and — for partial-unit — rooms offered for rental (validated against the bedroom
   cap in §6 at entry time, not just at dashboard-render time)
3. **Connect calendar** → paste iCal URL, platform select, trigger import job (see §5)
4. **Registration details** → registration number, expiry date
5. **Add another property?** → loop to step 2, or continue
6. **Dashboard** → all properties, status derived from ComplianceRule evaluation (not fixed
   thresholds — see §6), MAT due, renewals due
7. **Property detail** → night gauge, MAT ledger by period, renewal countdown, inspection
   checklist, documents, synced bookings table

---

## 5. Calendar sync & revenue — two data problems, two mechanisms

iCal and revenue are different problems and need different solutions. Do not conflate them.

### 5a. Night count → iCal (works today, no partnership needed)

- Standard `.ics` feed, one per platform per property (Airbnb and VRBO each publish their own
  export URL per listing — a property with both may need two `CalendarConnection` rows).
- Gives dates and a UID only — **no price**. This is sufficient for the night-cap counter, not
  for MAT.
- Sync on a polling schedule (every 6–12 hours) plus manual "Sync now" — iCal has no webhook/push.
- De-dupe on `external_uid` from the ICS `UID` field, not on date range.
- A booking that disappears on re-sync is a candidate cancellation, **not an automatic one**:
  - If a fetch returns **zero events** for a property that has existing active bookings, do not
    process any removals for that cycle. Treat it as a sync error: set `sync_status = error`,
    record `last_error`, increment `consecutive_empty_fetches`, and leave existing bookings
    untouched. A truncated or timed-out fetch must never read as "every booking cancelled."
  - Otherwise, only mark a booking cancelled once it has been absent across **two consecutive
    successful** syncs, not one — guards against a feed that's momentarily missing one entry.
  - A confirmed removal is written to `AuditLog` and excluded from the tally.
  - Surface `sync_status = error` on the dashboard/property detail so the host knows the tally may
    be stale, rather than silently trusting a last-known-good count.

### 5b. Revenue for MAT → do NOT go direct to Airbnb. Two tiers, in priority order:

**Tier 1 — PMS OAuth integration (primary path, build this first post-MVP):**
Airbnb's own reservation/transaction API is restricted to its Preferred Software Partner program —
individual tools cannot get direct access without going through Airbnb's formal partner review,
which is a slow, enterprise-grade process not worth pursuing pre-revenue. Instead, integrate with
the PMS layer that already has that access:

- **Hospitable** — public API, OAuth 2.0, documented, self-serve setup (`hospitable.com` developer
  docs). Reservation objects include price because Hospitable is an Airbnb Preferred+ Software
  Partner and inherits that data.
- **Guesty** — "Open API" tier, OAuth 2.0, Postman collection provided, similar reservation-with-
  price access.
- Flow: host who already uses one of these PMSs connects their existing account to Nightcap via
  OAuth (same pattern as "Connect your Google account"). Nightcap pulls reservations including
  price automatically. No manual entry, no CSV, ever, for these hosts.
- Reservation payloads from a PMS integration are also the first realistic path to guest-count
  data, which is what would eventually make the occupancy rule in §6b enforceable — a reason to
  prioritize Tier 1 beyond just MAT revenue.
- **[VERIFY]** current published rate limits, pricing tier gating (some of this may sit behind a
  paid Hospitable/Guesty plan the host must already have), and exact reservation object schema
  before implementation — confirm against each platform's current developer docs directly.

**Tier 2 — CSV import (fallback for self-managed hosts with no PMS):**
- Airbnb's Transaction History export and VRBO's booking/payout export are **account-wide**, not
  per-listing — a host with 6 properties under one Airbnb login gets every property's transactions
  in a single CSV. This is materially less painful than it sounds and should be positioned in
  product copy as "connect your Airbnb account's transaction history," not "enter revenue per
  property."
- Map CSV rows to existing `Booking` records by date range + property (listing name/address
  appears in the export) to backfill `gross_amount` without creating duplicate bookings.
- **[VERIFY]** current CSV column schema for both platforms before building the parser — these
  change without notice and a hardcoded column-index parser will silently break.

Do not build a scraper or unofficial-API workaround against Airbnb/VRBO login sessions — this
violates both platforms' terms of service and is a real account-suspension risk for every host who
connects, which is an unacceptable liability for a compliance product.

---

## 6. Compliance status logic

Status per property is derived, not stored, from current `ComplianceRule` rows:

```
status(property):
  if property.unit_type == partial_unit and no applicable cap rule → OK (no cap tier)
  nights_used = NightTally for current calendar year
  cap = ComplianceRule(night_cap, property.unit_type, property.municipality)
  days_to_renewal = registration_expiry_date - today

  if nights_used >= cap OR (days_to_renewal is not null and days_to_renewal < 14):
      → RISK
  elif nights_used >= cap * 0.85 OR (days_to_renewal < 30):
      → WARNING
  else:
      → OK
```

The `0.85` warning threshold and `14`/`30`-day renewal windows are product decisions, not bylaw
facts — keep these as tunable config, but they are not something to "verify" against a legal
source since they're a UX buffer, not a compliance requirement.

`cap` for a given `calendar_year` is resolved once, using the rule in effect on **January 1 of that
year**, not the rule in effect "today" — a mid-year rule change must not retroactively change the
cap for months already elapsed in the same calendar year.

### 6a. Boundary-crossing bookings (new)

A stay that spans Dec 28–Jan 3 crosses a calendar-year boundary (night cap) and, independently, a
booking that spans a quarter-end crosses a MAT-period boundary. v1 had no rule for this; both
`NightTally.nights_used` and `MatPeriod.gross_revenue` would otherwise attribute the whole stay to
whichever period the code happened to look at, silently under- or over-counting the other period.

Fix: attribute **per night, not per booking**.

- **Night cap:** when computing `NightTally` for a calendar year, count each night of a `Booking`
  individually against the calendar year that night falls in. A 6-night stay from Dec 29–Jan 4
  contributes 3 nights to the prior year's tally and 3 to the new year's, not 6 to either.
- **MAT revenue:** when a `Booking.gross_amount` is known and its date range crosses a
  `MatPeriod` boundary, prorate the amount by nights-in-period (`gross_amount * nights_in_period /
  total_nights`) and attribute each share to its respective `MatPeriod`. If the nightly rate isn't
  uniform (rare, but some bookings carry a lump-sum cleaning/service fee that shouldn't be
  prorated), flag the booking for manual split rather than silently prorating a value that isn't
  actually linear per night — do not guess.

### 6b. Occupancy rule — not enforceable in MVP (new)

`occupancy_limit` remains a valid `ComplianceRule` row (municipalities do publish this figure, and
Vancouver/Montréal may weight it differently later), but there is currently no data source that
gives Nightcap a guest count: iCal provides dates and a UID only, and manual `Booking` entries
don't collect it either. Rather than model a checklist item or status contribution that can never
actually be evaluated, MVP should:

- Display the rule as **informational** on the property detail screen ("Max 2 adults/bedroom per
  Toronto bylaw — not tracked; Nightcap has no guest-count data source yet"), not as a pass/fail
  checklist item or a contributor to §6's RISK/WARNING computation.
- Revisit once Tier 1 PMS integration (§5b) is built — Hospitable/Guesty reservation objects
  typically include guest counts, which would make this rule genuinely checkable.

---

## 7. MAT ledger

- Quarterly by default (confirm actual remittance cadence with the City **[VERIFY]** — some
  municipalities are monthly above a revenue threshold).
- `amount_owed = gross_revenue_for_period * rate_applied`, where `rate_applied` is read from
  `ComplianceRule` at the period's effective date (so a future rate change doesn't retroactively
  alter past periods), and `gross_revenue_for_period` is the sum of per-night-attributed revenue
  per §6a — not a naive sum of `Booking.gross_amount` for bookings whose `check_in` falls in the
  period, which would misattribute any boundary-crossing stay entirely to its check-in quarter.
- "Mark remitted" is a user action, not automatic — this product tracks obligation, it does not
  file or pay MAT on the host's behalf in v1. Do not build a payment-submission flow without an
  explicit decision to pursue a money-transmission/tax-remittance integration, which carries its
  own regulatory scope.

---

## 8. Registration verification

Toronto announced (per public reporting, spec-time) a registration-verification API used by
short-term rental platforms to validate host registration numbers, with data shared back to the
City. **[VERIFY]** whether this API is:
(a) platform-to-city only (Airbnb/VRBO ↔ City), with no third-party host-tool access, or
(b) open to registered third-party applications.
If (a), Nightcap cannot programmatically verify a host's registration status — the registration
number and expiry date must be self-reported by the host, with Nightcap tracking the countdown
only, not verifying validity. Do not build UI copy implying "verified with the City" unless (b) is
confirmed and implemented.

---

## 9. Tech stack (recommendation, not a hard requirement — confirm with team before locking)

- **Frontend:** React + TypeScript, matching the mockup's component structure (property cards,
  gauge component, panel layout)
- **Backend:** Node/TypeScript or Python — either is fine; pick based on team familiarity
- **DB:** Postgres — relational integrity matters here (a MAT period must reconcile against
  bookings; a compliance rule change must not silently corrupt historical calculations)
- **Auth:** standard email/password + session, or delegate to Clerk/Auth0 for v1 to avoid building
  auth from scratch
- **Background jobs:** needed for iCal polling sync — a simple cron-based worker is sufficient at
  MVP scale; do not over-engineer with a queue system before there's a reason to
- **Hosting:** any standard PaaS (Render, Railway, Fly.io) is sufficient for MVP; no need for
  multi-region infra at this stage

---

## 10. MVP scope (build this first)

- [ ] Sign up / log in
- [ ] Add property (Toronto only, entire-home or partial-unit, with bedroom count and — for
      partial-unit — rooms offered, validated against the bedroom cap at entry)
- [ ] Connect iCal (Airbnb + VRBO), manual sync trigger, night tally (per-night attribution across
      year boundaries, empty-fetch/debounce guard on cancellations)
- [ ] Registration number + expiry entry, countdown
- [ ] Dashboard: multi-property grid, status derived per §6
- [ ] Property detail: night gauge, registration countdown, inspection checklist (4 Toronto items),
      occupancy rule shown as informational-only (§6b), document upload (storage only, no
      OCR/validation in v1)
- [ ] MAT ledger: manual entry at MVP with per-night proration for boundary-crossing bookings
      (§6a/§7); CSV import (Tier 2, §5b) as fast-follow; Hospitable/Guesty OAuth (Tier 1, §5b) as
      the real target once there's a paying host base to justify the integration work
- [ ] Email reminders: renewal <30 days, cap >85%, MAT period closing

**Explicitly out of scope for MVP:** other municipalities, automated MAT revenue import,
registration API verification, payment/remittance filing, mobile app, team/multi-user accounts per
property, live guest-occupancy enforcement (§6b).

---

## 11. Open questions for the team before build starts

1. Confirm all **[VERIFY]** bylaw figures against the current Chapter 547 text directly — a spec
   built from aggregator blog posts (which is what informed this draft) is not a compliant source
   for a product whose entire value proposition is regulatory accuracy.
2. Confirm Hospitable and Guesty's current API rate limits, pricing-tier gating, and reservation
   object schema (§5b, Tier 1) directly against their developer docs before scoping the
   integration. Confirm Airbnb and VRBO's current CSV export column schema (§5b, Tier 2) the same
   way before building the parser.
3. Confirm City of Toronto's registration-verification API access model (§8) — this determines
   whether "verified" status is ever legitimate to display.
4. Decide MAT remittance cadence (quarterly assumed here) directly with the City's Municipal
   Accommodation Tax office, not inferred from third-party guides.
5. Decide how a booking with a non-uniform nightly rate (e.g. a lump-sum cleaning fee bundled into
   `gross_amount`) should be handled by the §6a proration rule — flagged for manual host review is
   the default in this spec; confirm that's acceptable UX before building it as a silent split.

---

## 12. Security & storage (new)

- **`CalendarConnection.ical_url`** is effectively a bearer credential — anyone holding the URL can
  read the host's full booking calendar. Encrypt it at rest (application-level field encryption,
  e.g. KMS-backed) rather than storing it as plain text, and never render the full URL back to the
  UI after initial entry — show a masked form (e.g. last few characters only).
- **`Document.file_url`** covers items like insurance certificates and fire safety certs, which can
  contain personal/financial information. Store documents in private object storage (not a
  publicly readable bucket/URL) and serve them via short-lived signed URLs generated per request,
  scoped to the requesting user's own properties.
