import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoMark, Wordmark } from "@/components/shells/logo-mark";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    unit: "/mo",
    blurb: "One property, full compliance tracking. No card required.",
    features: ["1 property", "Night cap tracking", "Inspection checklist", "Manual booking entry"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Host",
    price: "$19",
    unit: "/mo",
    blurb: "Predictable flat rate for hosts with a handful of listings.",
    features: ["Up to 5 properties", "Multi-platform iCal sync", "Compliance alerts", "Document vault"],
    cta: "Start free trial",
    featured: false,
  },
  {
    name: "Growth",
    price: "$49",
    unit: "/mo",
    blurb: "For multi-listing hosts who want everything in one place.",
    features: ["Up to 15 properties", "Everything in Host", "PMS integrations", "Priority support"],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Portfolio",
    price: "$99",
    unit: "/mo",
    blurb: "Flat rate for managers running a real portfolio.",
    features: ["Unlimited properties", "Everything in Growth", "Team seats", "CSV bulk import & export"],
    cta: "Talk to us",
    featured: false,
  },
];

const FEATURES = [
  {
    title: "Track nights across all your platforms",
    body: "Listed on Airbnb, VRBO, and Booking.com at once? Nightcap syncs all calendars into one place and tallies nights toward your 180-night cap across every platform — the only compliance figure that matters.",
  },
  {
    title: "Know your compliance status in real time",
    body: "Dashboard shows where you stand on every rule: nights used, registration renewal countdown, partial-unit bedroom caps, and required inspections. Early alerts at 85% so you're never caught off guard.",
  },
  {
    title: "Multi-platform iCal sync that doesn't break",
    body: "Connect Airbnb, VRBO, or your PMS once. Nightcap keeps bookings current with a debounced sync that survives flaky feeds and handles multi-platform double-bookings.",
  },
  {
    title: "3-year audit trail & compliance records",
    body: "Fire safety, business licence, insurance, booking logs — upload once, get reminded before anything expires, and hand auditors a complete, organized compliance file whenever required.",
  },
];

export function LandingPage() {
  const [address, setAddress] = require("react").useState("");

  return (
    <div className="min-h-dvh bg-app-sky">
      <header className="safe-top sticky top-0 z-40 border-b border-border/70 bg-surface-glass backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <LogoMark size={30} />
            <Wordmark className="text-[1.35rem] sm:text-xl" />
          </Link>
          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-full px-3.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-brand-soft hover:text-foreground"
            >
              Log in
            </Link>
            <Button asChild size="sm" className="h-10 px-4 shadow-soft">
              <Link href="/sign-up">Start free</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 text-center animate-page-in sm:px-6 sm:pb-20 sm:pt-16">
        <p className="text-sm font-semibold text-muted-foreground">
          For Canadian short-term rental hosts
        </p>
        <h1 className="mx-auto mt-3 max-w-3xl text-balance font-display text-[1.85rem] font-extrabold leading-[1.15] tracking-tight text-foreground sm:mt-4 sm:text-5xl md:text-[3.25rem]">
          Keep your STR listing compliant — across every platform.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
          Toronto's 180-night cap applies to every booking you take — Airbnb, VRBO, all of them combined. Nightcap makes sure you never exceed it, and stays on top of every other compliance rule that matters.
        </p>
        <div className="mt-8 mx-auto max-w-md">
          <div className="flex flex-col gap-2">
            <Input
              type="text"
              placeholder="Start today. Enter your address."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-11 text-base"
            />
            <Button asChild size="lg" className="w-full">
              <Link href={address ? `/sign-up?address=${encodeURIComponent(address)}` : "/sign-up"}>
                See your property on the map
              </Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Then set up compliance tracking for free. No card required.
          </p>
        </div>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="#pricing">View pricing →</Link>
          </Button>
        </div>

        <div className="animate-fade-in mx-auto mt-16 max-w-5xl overflow-hidden rounded-3xl border border-border bg-surface shadow-card-hover [animation-delay:120ms]">
          <div className="flex items-center gap-1.5 border-b border-border bg-surface-alt px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-status-risk/60" />
            <span className="size-2.5 rounded-full bg-status-warning/60" />
            <span className="size-2.5 rounded-full bg-status-ok/60" />
            <span className="ml-3 text-xs text-subtle-foreground">Nitecap.app/dashboard</span>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
            {[
              { label: "Nights used across all platforms", value: "142 / 180", tone: "ok" },
              { label: "Compliance status", value: "On track", tone: "ok" },
              { label: "License renewal", value: "Due in 11 days", tone: "risk" },
            ].map((kpi, i) => (
              <div
                key={kpi.label}
                className={cn(
                  "animate-fade-in rounded-2xl border border-border bg-surface-alt p-4 text-left",
                  i === 0 && "[animation-delay:80ms]",
                  i === 1 && "[animation-delay:160ms]",
                  i === 2 && "[animation-delay:240ms]"
                )}
              >
                <p className="text-xs font-medium text-subtle-foreground">{kpi.label}</p>
                <p
                  className={cn(
                    "mt-2 font-display text-2xl font-semibold tabular-nums",
                    kpi.tone === "ok" && "text-status-ok",
                    kpi.tone === "warning" && "text-status-warning",
                    kpi.tone === "risk" && "text-status-risk"
                  )}
                >
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-3xl border border-border bg-surface p-5 shadow-card">
              <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">Simple flat monthly pricing</h2>
          <p className="mt-3 text-muted-foreground">All prices in CAD. One rate for your plan — not per listing.</p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "flex flex-col rounded-3xl border p-6 shadow-card",
                tier.featured
                  ? "border-accent bg-surface shadow-card-hover ring-1 ring-accent"
                  : "border-border bg-surface"
              )}
            >
              {tier.featured && (
                <span className="mb-3 inline-flex w-fit rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-strong">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-xl font-semibold text-foreground">{tier.name}</h3>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-3xl font-semibold tabular-nums text-foreground">{tier.price}</span>
                <span className="text-sm text-subtle-foreground">{tier.unit}</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{tier.blurb}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-foreground">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-accent">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6" variant={tier.featured ? "primary" : "subtle"}>
                <Link href="/sign-up">{tier.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
        <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">Stop guessing if you're compliant.</h2>
        <p className="mt-3 text-muted-foreground">
          Set up your first property in minutes. See your night-count status, registration renewal countdown, and every compliance rule that matters — all in one place. No credit card required.
        </p>
        <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
          <Link href="/sign-up">Start free</Link>
        </Button>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-center text-sm text-subtle-foreground sm:flex-row sm:px-6 sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <LogoMark size={18} />
            <span className="max-w-xs text-balance sm:max-w-none">Nitecap — STR compliance tracking for Canadian hosts</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/sign-up" className="hover:text-foreground">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
