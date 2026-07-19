# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Nightcap
**Generated:** 2026-07-19 (curated — CLI defaults overridden)
**Category:** Civic compliance SaaS + Admin / Data-Dense Dashboard

> The ui-ux-pro-max CLI suggested pink/purple dark palettes. Those are rejected:
> Nightcap’s brand is cool paper + deep teal + navy rail (civic ledger, not
> fintech-gold or startup-indigo). Status greens/oranges/reds stay reserved for
> compliance signals and must never be used as brand accent.

---

## Global Rules

### Style
- **Host app:** Executive Dashboard — large KPIs, traffic-light status, scannable property cards
- **Admin:** Data-Dense Dashboard — compact tables, sticky headers, dense but readable type, filterable lists
- **Mode:** Light default + full dark tokens (system-aware)
- **Anti-patterns:** Ornate decoration, emoji icons, purple/indigo themes, warm-cream+terracotta stacks, hover-only interactions

### Color Palette (authoritative)

| Role | Light | Dark | Token |
|------|-------|------|-------|
| Background | `#f5f7fa` | `#0b0f1a` | `--background` |
| Surface | `#ffffff` | `#131a2b` | `--surface` |
| Foreground | `#12172b` | `#e8eaf0` | `--foreground` |
| Muted text | `#545f70` | `#a7afc0` | `--muted-foreground` |
| Accent | `#0f6e6e` | `#3fbdb5` | `--accent` |
| Accent soft | `#e3f1f0` | `#16302e` | `--accent-soft` |
| Rail | `#12172b` | `#080b14` | `--rail-background` |
| Status OK | `#0ca30c` | `#4caf6d` | `--status-ok` |
| Status Warning | `#ec835a` | `#d3a32e` | `--status-warning` |
| Status Risk | `#d03b3b` | `#e5726b` | `--status-risk` |

Accent sits far from the status trio so it is never mistaken for a compliance signal.

### Typography
- **Display (headings):** Source Serif 4 — ordinance / ledger authority
- **Body:** Public Sans — USWDS civic digital services
- **Mono (figures):** IBM Plex Mono — tabular nums for MAT, nights, money
- Base body ≥16px; table cells 13–14px; micro labels 11–12px uppercase tracking

### Spacing & Density
| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Tight gaps |
| `--space-sm` | 8px | Icon gaps |
| `--space-md` | 16px | Standard padding |
| `--space-lg` | 24px | Section padding |
| `--space-xl` | 32px | Large gaps |
| Admin card pad | 12–16px | Data-dense |
| Host card pad | 20–24px | Executive breathing room |
| Table row | ~40–44px min height | Touch-friendly |
| Sidebar | 240px | Desktop rail |

### Motion
- Micro-interactions: 150–250ms ease-out
- Page enter: 200ms fade + 4px translateY
- Prefer transform/opacity only
- Respect `prefers-reduced-motion`

### Effects
- Row highlight on hover (admin tables)
- KPI cards: subtle border + soft shadow, hover lift via transform
- Focus rings: 2px accent, 2px offset
- No glow, no glassmorphism, no multi-layer shadows

### UX Must-Haves
1. Mobile nav reachable (drawer / sheet) — not desktop-only sidebar
2. Tables wrap in `overflow-x-auto`
3. Visible labels on all inputs; errors near fields
4. Loading feedback on every async button
5. Touch targets ≥44px
6. `cursor-pointer` on clickable elements
7. Color never sole status indicator (badge text + soft fill)

---

## Page Overrides

- `pages/admin.md` — denser tables, KPI strip, compact forms
- `pages/dashboard.md` — executive KPI row + property grid
