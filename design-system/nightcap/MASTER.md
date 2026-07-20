# Design System Master — Nightcap (consumer host app)

> Curated from ui-ux-pro-max for a **consumer lifestyle** product — not enterprise BI.
> CLI defaults (pink parenting / dark-tech green) overridden for brand fit.

**Product:** Nightcap — personal STR compliance companion for hosts  
**Style:** Soft glass + lifestyle visual dashboard (gauges, charts, big status)  
**Audience:** Individual hosts on mobile first  
**Anti-patterns:** Corporate side rails, uppercase micro-labels everywhere, text-only KPI walls, purple/indigo startup themes, cream+terracotta stacks

---

## Color

| Role | Light | Dark |
|------|-------|------|
| Background | `#EEF1F7` soft dusk paper | `#0A0E1A` |
| Surface / glass | `rgba(255,255,255,0.72)` | `rgba(22,28,45,0.72)` |
| Foreground | `#121826` | `#F1F4FA` |
| Muted | `#5B657A` | `#9AA3B8` |
| Brand (night) | `#1A2240` | `#E8ECF8` |
| Accent (honey) | `#E8A017` | `#F0B429` |
| Accent soft | `#FFF4D6` | `#3A2E12` |
| OK / Warn / Risk | `#16A34A` / `#E89A3C` / `#E5484D` | lighter variants |

Accent is honey/amber (evening drink) — never status-green, never purple.

## Typography
- **Display / UI:** Plus Jakarta Sans (Friendly SaaS pairing)
- **Figures:** Plus Jakarta Sans tabular + mono fallback for money
- Headlines large and conversational; avoid ALL-CAPS micro labels as primary UI chrome

## Layout
- **Mobile:** Bottom tab bar (≤4 items) + compact top brand strip
- **Desktop:** Horizontal top nav, content max ~1080px, generous whitespace
- One primary visual per section (gauge / chart / status orb) — not walls of text

## Charts (from skill)
- Night cap → **Gauge** (performance vs target) + numeric
- Portfolio nights over months → **Area / line**
- MAT owed → big number + mini spark if history exists

## Motion
150–280ms ease-out; page fade; gauge draw; respect reduced-motion

## Effects
Frosted glass panels (`backdrop-blur`), soft ambient gradients, subtle depth — not heavy shadows or glow spam
