# Design System Master — Nitecap (consumer host app)

> Curated from ui-ux-pro-max for a **consumer lifestyle** product — not enterprise BI.
> CLI defaults (pink parenting / dark-tech green) overridden for brand fit.

**Product:** Nitecap — personal STR compliance companion for hosts  
**Style:** Soft glass + lifestyle visual dashboard (gauges, charts, big status)  
**Audience:** Individual hosts on mobile first  
**Anti-patterns:** Corporate side rails, uppercase micro-labels everywhere, text-only KPI walls, purple/indigo startup themes, cream+terracotta stacks

---

## Color

| Role | Light | Dark |
|------|-------|------|
| Background | `#EEF1F7` soft dusk paper | `#070A12` deep night |
| Surface | `#FFFFFF` | `#121826` elevated panel |
| Surface / glass | `rgba(255,255,255,0.72)` | frosted `#121826` + hairline highlight |
| Foreground | `#121826` | `#F4F6FB` |
| Muted | `#5B657A` | `#A7B0C4` |
| Brand (night) | `#1A2240` | `#EEF1F8` |
| Brand soft | `#E8EBF4` | `#252D44` lifted cool chip |
| Brand foreground | `#FFFFFF` | `#070A12` |
| Accent (honey) | `#E8A017` | `#F0B429` |
| Accent soft | `#FFF4D6` | `#2C2412` quiet amber well |
| OK / Warn / Risk | `#16A34A` / `#E89A3C` / `#E5484D` | bright marks on translucent soft wells |

Accent is honey/amber (evening drink) — never status-green, never purple.
Dark mode: layered elevation + warm amber / cool navy ambience — not flat black or purple neon.

## Typography
- **Display / UI:** Plus Jakarta Sans (Friendly SaaS pairing)
- **Figures:** Plus Jakarta Sans tabular + mono fallback for money
- Headlines large and conversational; avoid ALL-CAPS micro labels as primary UI chrome
- Page titles: `text-2xl font-extrabold` (wizard / section) up to `sm:text-3xl md:text-4xl` via `PageHeader`
- Card titles: `text-base font-extrabold`

## Controls
- Inputs & native selects: `h-12`, `rounded-2xl`, `border-border-strong`
- Compact inline selects (row actions): `h-9`, `rounded-xl`
- Use `NativeSelect` for FormData-backed selects; Radix `Select` for rich menus

## Surfaces
- App cards: `.glass` + `rounded-3xl`
- Nested form panels: `rounded-2xl border bg-surface-alt/40`
- Marketing feature/pricing cards: `rounded-3xl` to match app glass

## Nav
- Labels: Home · Properties · Documents · Account
- Active (mobile): `bg-brand-soft text-brand`
- Hide bottom tabs + FAB on onboarding wizard routes

## Layout
- **Mobile:** Bottom tab bar (≤4 items) + compact top brand strip
- **Desktop:** Horizontal top nav, content max ~1080px, generous whitespace
- One primary visual per section (gauge / chart / status orb) — not walls of text

## Home (portfolio)
- Multi-property: urgency-sorted dense list + thin portfolio strip — **not** a single-listing gauge hero
- **4+ listings:** default to “Needs a look” work queue; filter chips; search at 6+; compact rows; “N on track — show all”
- Single-property: large night-cap gauge is appropriate
- Photo gallery cards live on `/properties`; Home is for triage/compare
- Headline must match the portfolio state (e.g. “3 of 4 need a look”)

## Charts (from skill)
- Night cap (per property) → **Gauge** on detail / single-home; **bar** in portfolio list
- Portfolio nights over months → **Area / line**
- Tax owed → portfolio strip number + per-row amounts

## Motion
150–280ms ease-out; page fade; gauge draw; respect reduced-motion

## Effects
Frosted glass panels (`backdrop-blur`), soft ambient gradients, subtle depth — not heavy shadows or glow spam
