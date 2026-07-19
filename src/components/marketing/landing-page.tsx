import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark, Wordmark } from "@/components/shells/logo-mark";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    unit: "forever",
    blurb: "One property, full compliance tracking. No card required.",
    features: ["1 property", "Night-count & MAT tracking", "Inspection checklist", "Manual booking entry"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Starter",
    price: "$5",
    unit: "/property/mo",
    blurb: "For hosts getting serious about staying compliant.",
    features: ["Up to 5 properties", "Automatic iCal sync", "MAT remittance reminders", "Document vault"],
    cta: "Start free trial",
    featured: false,
  },
  {
    name: "Growth",
    price: "$4",
    unit: "/property/mo",
    blurb: "Cheaper per property as your portfolio scales.",
    features: ["Up to 15 properties", "Everything in Starter", "PMS integrations (Hospitable, Guesty)", "Priority support"],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Portfolio",
    price: "$3.50",
    unit: "/property/mo",
    blurb: "Built for property managers running a real operation.",
    features: ["Unlimited properties", "Everything in Growth", "Team seats", "CSV bulk import & export"],
    cta: "Talk to us",
    featured: false,
  },
];

const FEATURES = [
  {
    title: "Never miss a night-count deadline",
    body: "Nightcap tallies every booking against your municipality's short-term-rental night caps automatically, so you know exactly where you stand before the city does.",
  },
  {
    title: "MAT remittance, handled",
    body: "Municipal Accommodation Tax owed, collected, and remitted — tracked per booking, per period, with the paperwork ready when it's due.",
  },
  {
    title: "Calendars that sync themselves",
    body: "Connect Airbnb, VRBO, or your PMS once. Nightcap keeps bookings current with a debounced iCal sync built to survive flaky feeds.",
  },
  {
    title: "Inspection & document vault",
    body: "Fire safety, business licence, insurance — upload once, get reminded before anything expires, and hand auditors a clean paper trail.",
  },
];

export function LandingPage() {
  return (
    <div className="bg-app-atmosphere min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <LogoMark size={26} />
          <Wordmark />
        </div>
        <nav className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Start free</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-10 text-center animate-page-in">
        <span className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1 text-xs font-semibold text-muted-foreground shadow-card">
          Built for Canadian short-term rental hosts
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-balance font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          Stay compliant with your city&apos;s STR rules without losing a weekend to spreadsheets.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Nightcap tracks night counts, MAT remittance, licences, and inspections for every property you run —
          across every municipality that regulates short-term rentals.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up">Start free — no card needed</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="#pricing">See pricing</Link>
          </Button>
        </div>

        <div className="animate-fade-in stagger-2 mx-auto mt-16 max-w-5xl overflow-hidden rounded-xl border border-border bg-surface shadow-card-hover">
          <div className="flex items-center gap-1.5 border-b border-border bg-surface-alt px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-status-risk/60" />
            <span className="size-2.5 rounded-full bg-status-warning/60" />
            <span className="size-2.5 rounded-full bg-status-ok/60" />
            <span className="ml-3 text-xs text-subtle-foreground">nightcap.app/dashboard</span>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
            {[
              { label: "Nights used (Queen St W)", value: "142 / 180", tone: "ok" },
              { label: "MAT owed this period", value: "$1,284.60", tone: "warning" },
              { label: "Licence renewal", value: "Due in 11 days", tone: "risk" },
            ].map((kpi, i) => (
              <div
                key={kpi.label}
                className={cn(
                  "animate-fade-in rounded-lg border border-border bg-surface-alt p-4 text-left",
                  i === 0 && "stagger-1",
                  i === 1 && "stagger-2",
                  i === 2 && "stagger-3"
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

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold text-foreground">Simple, per-property pricing</h2>
          <p className="mt-3 text-muted-foreground">All prices in CAD. Cheaper per property as your portfolio grows.</p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "flex flex-col rounded-xl border p-6 shadow-card",
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

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-semibold text-foreground">Ready to stop guessing?</h2>
        <p className="mt-3 text-muted-foreground">
          Set up your first property in minutes. No credit card required for the free tier.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/sign-up">Start free</Link>
        </Button>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-subtle-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <LogoMark size={18} />
            <span>Nightcap — STR compliance tracking for Canadian hosts</span>
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
