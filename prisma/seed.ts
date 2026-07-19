import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "../src/generated/prisma/client";
import { encryptSecret, lastFour } from "../src/lib/crypto";
import { getDocumentStorage, buildDocumentStorageKey } from "../src/lib/storage";
import { recomputeNightTally } from "../src/lib/night-tally";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// A local Better Auth instance (not the guarded src/lib/auth.ts) so this
// plain Node script can call auth.api.signUpEmail directly to create a demo
// user with a real, working password hash.
const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 1 },
});

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

function daysAgo(days: number): Date {
  return daysFromNow(-days);
}

// ---------------------------------------------------------------------------
// Canadian jurisdictions with an accommodation tax on short-term rentals
// (MAT in Ontario, MRDT in BC, provincial tourism levy in Alberta, Québec
// lodging tax, etc.). Rates are seeded as dated mat_rate ComplianceRule rows
// — the platform admin can change any of them in /admin/tax-rates. Effective
// dates reflect when the *current* rate took effect per the cited source
// (verified 2026-07-19); scheduled future changes are extra dated rows.
// ---------------------------------------------------------------------------
const CANADIAN_JURISDICTIONS: Array<{
  name: string;
  province: string;
  rates: Array<{ rate: number; effectiveDate: string; sourceUrl: string }>;
}> = [
  // Ontario MAT (rates + effective dates per municipal scan COR2026-24 and city sites)
  { name: "Ottawa", province: "ON", rates: [
    { rate: 0.05, effectiveDate: "2023-01-01", sourceUrl: "https://ottawa.ca/en/living-ottawa/laws-licences-and-permits/laws/laws-z/municipal-accommodation-tax-law-no-2022-56" },
    { rate: 0.06, effectiveDate: "2026-01-01", sourceUrl: "https://ottawa.ca/en/living-ottawa/laws-licences-and-permits/laws/laws-z/municipal-accommodation-tax-law-no-2022-56" },
  ]},
  { name: "Mississauga", province: "ON", rates: [{ rate: 0.06, effectiveDate: "2024-01-01", sourceUrl: "https://www.mississauga.ca/publication/municipal-accommodation-tax-by-law/" }] },
  { name: "Hamilton", province: "ON", rates: [{ rate: 0.04, effectiveDate: "2023-01-01", sourceUrl: "https://www.hamilton.ca/home-neighbourhood/house-home/municipal-accommodation-tax" }] },
  { name: "London", province: "ON", rates: [{ rate: 0.05, effectiveDate: "2022-10-01", sourceUrl: "https://london.ca/business-development/municipal-accommodation-tax" }] },
  { name: "Kingston", province: "ON", rates: [{ rate: 0.05, effectiveDate: "2024-01-01", sourceUrl: "https://www.cityofkingston.ca/business/municipal-accommodation-tax/" }] },
  { name: "Windsor", province: "ON", rates: [{ rate: 0.06, effectiveDate: "2025-04-01", sourceUrl: "https://www.citywindsor.ca/visitors/municipal-accommodation-tax" }] },
  { name: "Markham", province: "ON", rates: [{ rate: 0.06, effectiveDate: "2026-04-01", sourceUrl: "https://www.markham.ca/about-city-markham/city-hall/municipal-accommodation-tax" }] },
  { name: "Vaughan", province: "ON", rates: [{ rate: 0.04, effectiveDate: "2019-04-01", sourceUrl: "https://www.vaughan.ca/services/business/mat" }] },
  { name: "Niagara Falls", province: "ON", rates: [{ rate: 0.04, effectiveDate: "2026-04-01", sourceUrl: "https://www.niagarafalls.ca/city-hall/finance/municipal-accommodation-tax.aspx" }] },
  { name: "Niagara-on-the-Lake", province: "ON", rates: [{ rate: 0.04, effectiveDate: "2025-01-01", sourceUrl: "https://www.notl.com/business-development/municipal-accommodation-tax" }] },
  { name: "Greater Sudbury", province: "ON", rates: [{ rate: 0.06, effectiveDate: "2025-01-01", sourceUrl: "https://www.greatersudbury.ca/do-business/municipal-accommodation-tax/" }] },
  { name: "Thunder Bay", province: "ON", rates: [{ rate: 0.05, effectiveDate: "2024-10-07", sourceUrl: "https://www.thunderbay.ca/en/city-hall/municipal-accommodation-tax.aspx" }] },
  { name: "Sault Ste. Marie", province: "ON", rates: [{ rate: 0.06, effectiveDate: "2025-06-02", sourceUrl: "https://saultstemarie.ca/City-Hall/City-Departments/Corporate-Services/Finance/Municipal-Accommodation-Tax.aspx" }] },
  { name: "Guelph", province: "ON", rates: [{ rate: 0.04, effectiveDate: "2022-09-01", sourceUrl: "https://guelph.ca/business/municipal-accommodation-tax/" }] },
  { name: "Burlington", province: "ON", rates: [{ rate: 0.04, effectiveDate: "2022-10-01", sourceUrl: "https://www.burlington.ca/en/business-in-burlington/municipal-accommodation-tax.aspx" }] },
  { name: "Oakville", province: "ON", rates: [{ rate: 0.04, effectiveDate: "2019-01-01", sourceUrl: "https://www.oakville.ca/business-development/municipal-accommodation-tax/" }] },
  { name: "Pickering", province: "ON", rates: [{ rate: 0.04, effectiveDate: "2025-05-01", sourceUrl: "https://www.pickering.ca/en/city-hall/municipal-accommodation-tax.aspx" }] },
  { name: "Whitby", province: "ON", rates: [{ rate: 0.04, effectiveDate: "2024-07-15", sourceUrl: "https://www.whitby.ca/en/business/municipal-accommodation-tax.aspx" }] },
  { name: "Stratford", province: "ON", rates: [{ rate: 0.04, effectiveDate: "2023-07-01", sourceUrl: "https://www.stratford.ca/en/inside-city-hall/municipal-accommodation-tax.aspx" }] },
  { name: "Collingwood", province: "ON", rates: [{ rate: 0.04, effectiveDate: "2025-03-01", sourceUrl: "https://www.collingwood.ca/business-development/municipal-accommodation-tax" }] },
  { name: "Prince Edward County", province: "ON", rates: [{ rate: 0.04, effectiveDate: "2021-02-01", sourceUrl: "https://www.thecounty.ca/business-in-the-county/municipal-accommodation-tax/" }] },
  { name: "Barrie", province: "ON", rates: [{ rate: 0.04, effectiveDate: "2024-01-01", sourceUrl: "https://www.barrie.ca/business-development/municipal-accommodation-tax" }] },

  // British Columbia — 8% PST is collected by platforms; the municipal-level
  // levy is the 3% MRDT. Vancouver additionally has the 2.5% Major Events
  // MRDT (Feb 1 2023 – Jan 31 2030), so 5.5% until it sunsets.
  { name: "Vancouver", province: "BC", rates: [
    { rate: 0.055, effectiveDate: "2023-02-01", sourceUrl: "https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst/charge-collect/accommodation" },
    { rate: 0.03, effectiveDate: "2030-02-01", sourceUrl: "https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst/charge-collect/accommodation" },
  ]},
  { name: "Victoria", province: "BC", rates: [{ rate: 0.03, effectiveDate: "2023-01-01", sourceUrl: "https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst/charge-collect/accommodation" }] },
  { name: "Whistler", province: "BC", rates: [{ rate: 0.03, effectiveDate: "2023-01-01", sourceUrl: "https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst/charge-collect/accommodation" }] },
  { name: "Kelowna", province: "BC", rates: [{ rate: 0.03, effectiveDate: "2023-01-01", sourceUrl: "https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst/charge-collect/accommodation" }] },

  // Québec — 3.5% provincial lodging tax, administered by Revenu Québec per
  // tourism region (platforms collect for most STR hosts).
  { name: "Montréal", province: "QC", rates: [{ rate: 0.035, effectiveDate: "2023-01-01", sourceUrl: "https://www.revenuquebec.ca/en/businesses/consumption-taxes/tax-on-lodging/" }] },
  { name: "Québec City", province: "QC", rates: [{ rate: 0.035, effectiveDate: "2023-01-01", sourceUrl: "https://www.revenuquebec.ca/en/businesses/consumption-taxes/tax-on-lodging/" }] },

  // Alberta — 4% provincial Tourism Levy applies to STRs (no municipal MAT).
  { name: "Calgary", province: "AB", rates: [{ rate: 0.04, effectiveDate: "2023-01-01", sourceUrl: "https://www.alberta.ca/tourism-levy" }] },
  { name: "Edmonton", province: "AB", rates: [{ rate: 0.04, effectiveDate: "2023-01-01", sourceUrl: "https://www.alberta.ca/tourism-levy" }] },
  { name: "Banff", province: "AB", rates: [{ rate: 0.04, effectiveDate: "2023-01-01", sourceUrl: "https://www.alberta.ca/tourism-levy" }] },

  // Manitoba / Nova Scotia / Newfoundland
  { name: "Winnipeg", province: "MB", rates: [{ rate: 0.05, effectiveDate: "2023-01-01", sourceUrl: "https://www.winnipeg.ca/taxation-corporate-finance/accommodation-tax" }] },
  { name: "Halifax", province: "NS", rates: [{ rate: 0.03, effectiveDate: "2023-04-01", sourceUrl: "https://www.halifax.ca/home-property/property-taxes/marketing-levy" }] },
  { name: "St. John's", province: "NL", rates: [{ rate: 0.04, effectiveDate: "2023-09-01", sourceUrl: "https://www.stjohns.ca/en/business-development/accommodation-tax.aspx" }] },
];

async function main() {
  console.log("Seeding pricing tiers...");
  // Same four rows the pricing_tiers migration inserts for existing DBs —
  // upserted here (by stable code) so a fresh `db push` database gets them
  // too, and so isDefault is always exactly one tier.
  const tierSeed = [
    { code: "free", name: "Free", description: "First property free — try Nightcap end to end.", propertyLimit: 1 as number | null, pricePerPropertyCents: 0, isDefault: true, displayOrder: 0 },
    { code: "starter", name: "Starter", description: "For hosts with a handful of listings.", propertyLimit: 5 as number | null, pricePerPropertyCents: 500, isDefault: false, displayOrder: 1 },
    { code: "growth", name: "Growth", description: "Growing portfolios at a better per-property rate.", propertyLimit: 15 as number | null, pricePerPropertyCents: 400, isDefault: false, displayOrder: 2 },
    { code: "portfolio", name: "Portfolio", description: "Unlimited properties at the best per-property rate.", propertyLimit: null as number | null, pricePerPropertyCents: 350, isDefault: false, displayOrder: 3 },
  ];
  const tiersByCode = new Map<string, { id: string }>();
  for (const t of tierSeed) {
    const tier = await prisma.pricingTier.upsert({
      where: { code: t.code },
      create: t,
      update: { name: t.name, description: t.description, propertyLimit: t.propertyLimit, pricePerPropertyCents: t.pricePerPropertyCents, displayOrder: t.displayOrder },
    });
    tiersByCode.set(t.code, tier);
  }

  console.log("Seeding municipalities + compliance rules...");

  const toronto = await prisma.municipality.upsert({
    where: { name_province: { name: "Toronto", province: "ON" } },
    create: { name: "Toronto", province: "ON", active: true },
    update: { active: true },
  });

  console.log("Seeding Canadian jurisdiction tax rates...");
  for (const jurisdiction of CANADIAN_JURISDICTIONS) {
    const municipality = await prisma.municipality.upsert({
      where: { name_province: { name: jurisdiction.name, province: jurisdiction.province } },
      // Enabled so the correct tax rate applies as soon as a host registers a
      // property there; admins can disable jurisdictions in /admin/rules.
      create: { name: jurisdiction.name, province: jurisdiction.province, active: true },
      update: {},
    });

    for (const { rate, effectiveDate, sourceUrl } of jurisdiction.rates) {
      const effective = new Date(`${effectiveDate}T00:00:00Z`);
      await prisma.complianceRule.upsert({
        where: {
          municipalityId_ruleType_unitType_effectiveDate: {
            municipalityId: municipality.id,
            ruleType: "mat_rate",
            unitType: "all",
            effectiveDate: effective,
          },
        },
        create: {
          municipalityId: municipality.id,
          ruleType: "mat_rate",
          unitType: "all",
          value: { rate },
          effectiveDate: effective,
          sourceUrl,
          verifiedAt: new Date("2026-07-19T00:00:00Z"),
        },
        update: { value: { rate }, sourceUrl, verifiedAt: new Date("2026-07-19T00:00:00Z") },
      });
    }
  }

  const effectiveDate = new Date("2024-01-01T00:00:00Z");
  const rules: Array<{
    ruleType:
      | "night_cap"
      | "mat_rate"
      | "registration_fee"
      | "occupancy_limit"
      | "record_retention_years"
      | "partial_unit_bedroom_cap";
    unitType: "entire_home" | "partial_unit" | "all";
    value: object;
    sourceUrl: string;
    effectiveDate?: Date;
  }> = [
    {
      ruleType: "night_cap",
      unitType: "entire_home",
      value: { nights: 180 },
      sourceUrl: "https://www.toronto.ca/legdocs/municode/1184_547.pdf",
    },
    {
      ruleType: "partial_unit_bedroom_cap",
      unitType: "partial_unit",
      value: { maxBedroomsSimultaneous: 3, oneFewerThanTotal: true },
      sourceUrl: "https://www.toronto.ca/legdocs/municode/1184_547.pdf",
    },
    // MAT: dated rates — temporary 8.5% Jun 1 2025–Jul 31 2026 (City Good Operator Guide)
    {
      ruleType: "mat_rate",
      unitType: "all",
      value: { rate: 0.06 },
      sourceUrl:
        "https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-accommodation-tax-mat/",
    },
    {
      ruleType: "mat_rate",
      unitType: "all",
      value: { rate: 0.085 },
      effectiveDate: new Date("2025-06-01T00:00:00Z"),
      sourceUrl:
        "https://www.toronto.ca/wp-content/uploads/2021/03/8d70-Good-Operator-Guide.pdf",
    },
    {
      ruleType: "mat_rate",
      unitType: "all",
      value: { rate: 0.06 },
      effectiveDate: new Date("2026-08-01T00:00:00Z"),
      sourceUrl:
        "https://www.toronto.ca/wp-content/uploads/2021/03/8d70-Good-Operator-Guide.pdf",
    },
    {
      ruleType: "registration_fee",
      unitType: "all",
      value: { feeCents: 5322 },
      sourceUrl: "https://www.toronto.ca/services-payments/business-licences-permits/short-term-rentals/",
    },
    {
      ruleType: "occupancy_limit",
      unitType: "all",
      value: { adultsPerBedroom: 2 },
      sourceUrl: "https://www.toronto.ca/legdocs/municode/1184_547.pdf",
    },
    {
      ruleType: "record_retention_years",
      unitType: "all",
      value: { years: 3 },
      sourceUrl: "https://www.toronto.ca/legdocs/municode/1184_547.pdf",
    },
  ];

  for (const rule of rules) {
    const ruleEffective = rule.effectiveDate ?? effectiveDate;
    await prisma.complianceRule.upsert({
      where: {
        municipalityId_ruleType_unitType_effectiveDate: {
          municipalityId: toronto.id,
          ruleType: rule.ruleType,
          unitType: rule.unitType,
          effectiveDate: ruleEffective,
        },
      },
      create: {
        municipalityId: toronto.id,
        ruleType: rule.ruleType,
        unitType: rule.unitType,
        value: rule.value,
        sourceUrl: rule.sourceUrl,
        effectiveDate: ruleEffective,
        verifiedAt: new Date("2026-07-19T00:00:00Z"),
      },
      update: {
        value: rule.value,
        sourceUrl: rule.sourceUrl,
        verifiedAt: new Date("2026-07-19T00:00:00Z"),
      },
    });
  }

  console.log("Seeding demo host user...");
  const demoEmail = "dana@queensthosting.ca";
  let user = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!user) {
    const result = await auth.api.signUpEmail({
      body: { name: "Dana Okafor", email: demoEmail, password: "1" },
    });
    user = await prisma.user.findUniqueOrThrow({ where: { id: result.user.id } });
  }
  console.log(`  Demo host login: ${demoEmail} / 1`);
  const starterTier = tiersByCode.get("starter")!;
  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tierId: starterTier.id,
      propertyLimit: 5,
      pricePerPropertyCents: 500,
      startedAt: daysAgo(214),
    },
    update: {},
  });

  console.log("Seeding platform admin...");
  const adminEmail = "admin@nightcap.app";
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const result = await auth.api.signUpEmail({
      body: { name: "Nightcap Admin", email: adminEmail, password: "1" },
    });
    admin = await prisma.user.findUniqueOrThrow({ where: { id: result.user.id } });
  }
  await prisma.user.update({ where: { id: admin.id }, data: { role: "admin" } });
  console.log(`  Admin login: ${adminEmail} / 1`);

  console.log("Seeding properties...");
  const storage = getDocumentStorage();

  // --- Queen St Loft: entire_home, WARNING via nights (>=85%), boundary-crossing MAT example ---
  const queenSt = await prisma.property.create({
    data: {
      userId: user.id,
      nickname: "Queen St Loft",
      address: "412 Queen St W, Toronto, ON",
      municipalityId: toronto.id,
      unitType: "entire_home",
      bedroomCount: 2,
      registrationNumber: "STR-2024-08841",
      registrationIssueDate: daysAgo(300),
      registrationExpiryDate: daysFromNow(59),
      registrationStatus: "active",
    },
  });
  const queenStConn = await encryptedConnection(queenSt.id, "airbnb", "https://www.airbnb.ca/calendar/ical/48213991.ics?s=8f2a1c9d3e91");
  await prisma.calendarConnection.update({
    where: { id: queenStConn.id },
    data: { lastSyncedAt: daysAgo(0), syncStatus: "connected" },
  });
  await seedBookings(queenSt.id, queenStConn.id, [
    { checkIn: daysFromNow(7), checkOut: daysFromNow(10), platform: "airbnb" },
    { checkIn: daysFromNow(16), checkOut: daysFromNow(23), platform: "airbnb" },
    { checkIn: daysFromNow(29), checkOut: daysFromNow(31), platform: "vrbo" },
  ]);
  // A booking already in the past that straddles a MAT quarter boundary — the
  // point of fix #1/#6a. Hardcoded to a real Dec 29 -> Jan 4 boundary.
  const straddle = await prisma.booking.create({
    data: {
      propertyId: queenSt.id,
      calendarConnectionId: queenStConn.id,
      checkIn: new Date("2025-12-29T00:00:00Z"),
      checkOut: new Date("2026-01-04T00:00:00Z"),
      nights: 6,
      platform: "airbnb",
      source: "csv_import",
      grossAmount: 1380,
      externalUid: "straddle-demo-uid",
    },
  });
  // Pad nights so this property lands solidly in WARNING territory (>=85% of 180).
  await seedBookings(queenSt.id, queenStConn.id, bulkNights(daysAgo(200), 150, "airbnb"));
  await recomputeNightTally(queenSt.id);
  await seedMatLedger(queenSt.id, [
    { start: "2025-10-01", end: "2025-12-31", revenue: 18400, status: "remitted", remittedDaysAgo: 190 },
    { start: "2026-01-01", end: "2026-03-31", revenue: 21150, status: "remitted", remittedDaysAgo: 100 },
    { start: "2026-04-01", end: "2026-06-30", revenue: 24980, status: "due" },
  ]);
  await seedChecklist(queenSt.id, { occupancy_posting: false });
  await seedDocuments(storage, queenSt.id, [
    { docType: "fire_safety_cert", fileName: "fire-safety-certificate.pdf", expiryDays: 109 },
    { docType: "insurance", fileName: "liability-insurance.pdf", expiryDays: 216 },
    { docType: "floor_plan", fileName: "floor-plan.png", expiryDays: null },
  ]);
  void straddle;

  // --- Harbourfront 2BR: entire_home, RISK (over cap + <14d renewal + sync error) ---
  const harbourfront = await prisma.property.create({
    data: {
      userId: user.id,
      nickname: "Harbourfront 2BR",
      address: "88 Queens Quay W, Toronto, ON",
      municipalityId: toronto.id,
      unitType: "entire_home",
      bedroomCount: 2,
      registrationNumber: "STR-2023-04417",
      registrationIssueDate: daysAgo(356),
      registrationExpiryDate: daysFromNow(9),
      registrationStatus: "active",
    },
  });
  const harbourfrontConn = await encryptedConnection(harbourfront.id, "airbnb", "https://www.airbnb.ca/calendar/ical/91827364.ics?s=aa11bb22cc33");
  await prisma.calendarConnection.update({
    where: { id: harbourfrontConn.id },
    data: {
      lastSyncedAt: daysAgo(3),
      syncStatus: "error",
      lastError: "Feed returned zero events while bookings exist — treated as a sync failure, not a mass cancellation.",
      consecutiveEmptyFetches: 1,
    },
  });
  await seedBookings(harbourfront.id, harbourfrontConn.id, [
    { checkIn: daysFromNow(3), checkOut: daysFromNow(6), platform: "airbnb" },
    { checkIn: daysFromNow(11), checkOut: daysFromNow(15), platform: "airbnb" },
    ...bulkNights(daysAgo(178), 170, "airbnb"),
  ]);
  await recomputeNightTally(harbourfront.id);
  await seedMatLedger(harbourfront.id, [
    { start: "2026-01-01", end: "2026-03-31", revenue: 30200, status: "remitted", remittedDaysAgo: 95 },
    { start: "2026-04-01", end: "2026-06-30", revenue: 33840, status: "due" },
  ]);
  await seedChecklist(harbourfront.id, { egress: false });
  await seedDocuments(storage, harbourfront.id, [
    { docType: "fire_safety_cert", fileName: "fire-safety-certificate.pdf", expiryDays: 176 },
    { docType: "insurance", fileName: "liability-insurance.pdf", expiryDays: -17 },
  ]);

  // --- Annex Garden Suite: entire_home, WARNING via renewal countdown only ---
  const annex = await prisma.property.create({
    data: {
      userId: user.id,
      nickname: "Annex Garden Suite",
      address: "176 Madison Ave, Toronto, ON",
      municipalityId: toronto.id,
      unitType: "entire_home",
      bedroomCount: 1,
      registrationNumber: "STR-2025-01120",
      registrationIssueDate: daysAgo(343),
      registrationExpiryDate: daysFromNow(22),
      registrationStatus: "active",
    },
  });
  const annexConn = await encryptedConnection(annex.id, "vrbo", "https://www.vrbo.com/icalendar/aa9182ff2e.ics");
  await prisma.calendarConnection.update({
    where: { id: annexConn.id },
    data: { lastSyncedAt: daysAgo(0), syncStatus: "connected" },
  });
  await seedBookings(annex.id, annexConn.id, [{ checkIn: daysFromNow(8), checkOut: daysFromNow(11), platform: "vrbo" }]);
  await recomputeNightTally(annex.id);
  await seedMatLedger(annex.id, [{ start: "2026-04-01", end: "2026-06-30", revenue: 6200, status: "remitted", remittedDaysAgo: 12 }]);
  await seedChecklist(annex.id, {});
  await seedDocuments(storage, annex.id, [
    { docType: "fire_safety_cert", fileName: "fire-safety-certificate.pdf", expiryDays: 229 },
    { docType: "insurance", fileName: "liability-insurance.pdf", expiryDays: 87 },
  ]);

  // --- Leslieville Room: partial_unit, OK (static bedroom-cap check, fix #2) ---
  const leslieville = await prisma.property.create({
    data: {
      userId: user.id,
      nickname: "Leslieville Room",
      address: "901 Queen St E, Toronto, ON",
      municipalityId: toronto.id,
      unitType: "partial_unit",
      bedroomCount: 4,
      roomsOffered: 2,
      registrationNumber: "STR-2024-09982",
      registrationIssueDate: daysAgo(189),
      registrationExpiryDate: daysFromNow(177),
      registrationStatus: "active",
    },
  });
  const leslievilleConn = await encryptedConnection(leslieville.id, "airbnb", "https://www.airbnb.ca/calendar/ical/55219900.ics?s=ff00ee11dd22");
  await prisma.calendarConnection.update({
    where: { id: leslievilleConn.id },
    data: { lastSyncedAt: daysAgo(1), syncStatus: "connected" },
  });
  await seedBookings(leslieville.id, leslievilleConn.id, [{ checkIn: daysFromNow(2), checkOut: daysFromNow(5), platform: "airbnb" }]);
  await seedMatLedger(leslieville.id, [{ start: "2026-04-01", end: "2026-06-30", revenue: 4100, status: "due" }]);
  await seedChecklist(leslieville.id, {});
  await seedDocuments(storage, leslieville.id, [{ docType: "fire_safety_cert", fileName: "fire-safety-certificate.pdf", expiryDays: 199 }]);

  console.log("Done.");

  // ---- helpers ----

  async function encryptedConnection(propertyId: string, platform: "airbnb" | "vrbo" | "direct", url: string) {
    const encrypted = encryptSecret(url);
    return prisma.calendarConnection.create({
      data: {
        propertyId,
        platform,
        icalUrlCiphertext: encrypted.ciphertext,
        icalUrlIv: encrypted.iv,
        icalUrlLastFour: lastFour(url),
      },
    });
  }

  function bulkNights(startingFrom: Date, totalNights: number, platform: "airbnb" | "vrbo" | "direct") {
    // Splits totalNights into a handful of past bookings so tallies look
    // realistic rather than one implausible multi-month stay.
    const bookings: Array<{ checkIn: Date; checkOut: Date; platform: "airbnb" | "vrbo" | "direct" }> = [];
    let remaining = totalNights;
    let cursor = new Date(startingFrom);
    while (remaining > 0) {
      const stay = Math.min(remaining, 5 + (remaining % 4));
      const checkIn = new Date(cursor);
      const checkOut = new Date(cursor);
      checkOut.setUTCDate(checkOut.getUTCDate() + stay);
      bookings.push({ checkIn, checkOut, platform });
      cursor = new Date(checkOut);
      cursor.setUTCDate(cursor.getUTCDate() + 2); // a short gap between stays
      remaining -= stay;
    }
    return bookings;
  }

  async function seedBookings(
    propertyId: string,
    calendarConnectionId: string,
    bookings: Array<{ checkIn: Date; checkOut: Date; platform: "airbnb" | "vrbo" | "direct" }>
  ) {
    for (const [i, b] of bookings.entries()) {
      const nights = Math.round((+b.checkOut - +b.checkIn) / (24 * 60 * 60 * 1000));
      await prisma.booking.create({
        data: {
          propertyId,
          calendarConnectionId,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          nights,
          platform: b.platform,
          source: "ical_import",
          externalUid: `seed-${propertyId}-${i}-${b.checkIn.getTime()}`,
        },
      });
    }
  }

  async function seedMatLedger(
    propertyId: string,
    periods: Array<{ start: string; end: string; revenue: number; status: "due" | "remitted"; remittedDaysAgo?: number }>
  ) {
    for (const p of periods) {
      const periodStart = new Date(`${p.start}T00:00:00Z`);
      const periodEnd = new Date(`${p.end}T00:00:00Z`);
      // Use current Toronto MAT rate as of period start (8.5% during temporary window)
      const rate = periodStart >= new Date("2025-06-01T00:00:00Z") &&
        periodStart < new Date("2026-08-01T00:00:00Z")
        ? 0.085
        : 0.06;
      await prisma.matPeriod.create({
        data: {
          propertyId,
          periodStart,
          periodEnd,
          grossRevenue: p.revenue,
          rateApplied: rate,
          amountOwed: Math.round(p.revenue * rate * 100) / 100,
          status: p.status,
          remittedAt: p.status === "remitted" ? daysAgo(p.remittedDaysAgo ?? 30) : null,
        },
      });
    }
  }

  async function seedChecklist(propertyId: string, incomplete: Partial<Record<string, boolean>>) {
    const items = ["smoke_detector", "co_detector", "egress", "occupancy_posting"];
    for (const key of items) {
      const done = incomplete[key] === false ? false : true;
      await prisma.inspectionItem.create({
        data: {
          propertyId,
          itemKey: key,
          completed: done,
          completedAt: done ? daysAgo(60) : null,
        },
      });
    }
  }

  async function seedDocuments(
    storageDriver: ReturnType<typeof getDocumentStorage>,
    propertyId: string,
    docs: Array<{ docType: "fire_safety_cert" | "insurance" | "floor_plan" | "other"; fileName: string; expiryDays: number | null }>
  ) {
    for (const d of docs) {
      const doc = await prisma.document.create({
        data: {
          propertyId,
          docType: d.docType,
          fileName: d.fileName,
          storageKey: "",
          mimeType: d.fileName.endsWith(".png") ? "image/png" : "application/pdf",
          sizeBytes: 0,
          expiryDate: d.expiryDays !== null ? daysFromNow(d.expiryDays) : null,
        },
      });
      const key = buildDocumentStorageKey(propertyId, doc.id, d.fileName);
      const placeholder = Buffer.from(
        `Nightcap seed placeholder for ${d.fileName}\nProperty: ${propertyId}\nDocument: ${doc.id}\n`
      );
      await storageDriver.put(key, placeholder, doc.mimeType);
      await prisma.document.update({ where: { id: doc.id }, data: { storageKey: key, sizeBytes: placeholder.length } });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
