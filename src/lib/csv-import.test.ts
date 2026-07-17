import { describe, it, expect } from "vitest";
import {
  parseTransactionCsv,
  matchTransactionsToBookings,
  AIRBNB_DEFAULT_MAPPING,
} from "./csv-import";

describe("parseTransactionCsv", () => {
  it("parses rows by header name, not fixed column index", () => {
    const csv = ["Date,Listing,Amount", "2026-07-20,Queen St Loft,\"$1,234.50\"", "2026-07-25,Annex Suite,890.00"].join(
      "\n"
    );
    const rows = parseTransactionCsv(csv, AIRBNB_DEFAULT_MAPPING);
    expect(rows).toHaveLength(2);
    expect(rows[0].amountCents).toBe(123450);
    expect(rows[0].listing).toBe("Queen St Loft");
    expect(rows[1].amountCents).toBe(89000);
  });

  it("still works when the CSV's columns are reordered", () => {
    const csv = ["Amount,Date,Listing", "500.00,2026-08-01,Harbourfront 2BR"].join("\n");
    const rows = parseTransactionCsv(csv, AIRBNB_DEFAULT_MAPPING);
    expect(rows[0].amountCents).toBe(50000);
    expect(rows[0].listing).toBe("Harbourfront 2BR");
  });

  it("throws a clear error when an expected column is missing (not a silent misparse)", () => {
    const csv = ["Date,Listing", "2026-07-20,Queen St Loft"].join("\n");
    expect(() => parseTransactionCsv(csv, AIRBNB_DEFAULT_MAPPING)).toThrow(/Amount/);
  });

  it("skips rows with an unparseable date or amount rather than crashing", () => {
    const csv = ["Date,Listing,Amount", "not-a-date,Queen St Loft,100.00", "2026-07-20,Queen St Loft,n/a"].join("\n");
    expect(parseTransactionCsv(csv, AIRBNB_DEFAULT_MAPPING)).toHaveLength(0);
  });
});

describe("matchTransactionsToBookings", () => {
  const bookings = [
    { id: "b1", checkIn: new Date("2026-07-20"), checkOut: new Date("2026-07-23"), grossAmount: null },
    { id: "b2", checkIn: new Date("2026-08-01"), checkOut: new Date("2026-08-05"), grossAmount: null },
  ];

  it("matches a transaction date that falls within a booking's stay", () => {
    const [result] = matchTransactionsToBookings(
      [{ date: new Date("2026-07-21"), listing: "x", amountCents: 10000 }],
      bookings
    );
    expect(result.matchedBookingId).toBe("b1");
  });

  it("reports unmatched rows instead of guessing or duplicating", () => {
    const [result] = matchTransactionsToBookings(
      [{ date: new Date("2026-09-01"), listing: "x", amountCents: 10000 }],
      bookings
    );
    expect(result.matchedBookingId).toBeNull();
  });
});
