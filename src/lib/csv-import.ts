/**
 * Tier 2 CSV import (spec §5b): Airbnb's Transaction History export and
 * VRBO's booking/payout export back-fill Booking.grossAmount for properties
 * synced via iCal (which never carries price). Column *names* are
 * configurable, not hardcoded indices — "these change without notice and a
 * hardcoded column-index parser will silently break" per spec — so this
 * takes a caller-supplied mapping from semantic field to the CSV's actual
 * header text, with the current common headers as defaults, not gospel.
 */

export interface ColumnMapping {
  /** Header for the transaction/stay date. */
  date: string;
  /** Header identifying which listing this row belongs to (name or address). */
  listing: string;
  /** Header for the gross amount. */
  amount: string;
}

export const AIRBNB_DEFAULT_MAPPING: ColumnMapping = {
  date: "Date",
  listing: "Listing",
  amount: "Amount",
};

export const VRBO_DEFAULT_MAPPING: ColumnMapping = {
  date: "Arrival Date",
  listing: "Property Name",
  amount: "Payout Amount",
};

export interface ParsedTransactionRow {
  date: Date;
  listing: string;
  amountCents: number;
}

/** Minimal CSV parser: no quoted-comma support beyond basic double-quote
 * escaping, which covers Airbnb/VRBO's exports. Swap for a proper CSV
 * library if a platform's export turns out to need more. */
export function parseTransactionCsv(csvText: string, mapping: ColumnMapping): ParsedTransactionRow[] {
  const lines = csvText.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]);
  const indexOf = (name: string) => {
    const idx = header.findIndex((h) => h.trim().toLowerCase() === name.trim().toLowerCase());
    if (idx === -1) {
      throw new Error(`Expected a "${name}" column in the CSV — found: ${header.join(", ")}`);
    }
    return idx;
  };

  const dateIdx = indexOf(mapping.date);
  const listingIdx = indexOf(mapping.listing);
  const amountIdx = indexOf(mapping.amount);

  const rows: ParsedTransactionRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    if (cells.length <= Math.max(dateIdx, listingIdx, amountIdx)) continue;

    const date = new Date(cells[dateIdx].trim());
    if (Number.isNaN(date.getTime())) continue;

    const amountCents = parseAmountToCents(cells[amountIdx]);
    if (amountCents === null) continue;

    rows.push({ date, listing: cells[listingIdx].trim(), amountCents });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

export interface BookingCandidate {
  id: string;
  checkIn: Date;
  checkOut: Date;
  grossAmount: number | null;
}

export interface MatchResult {
  row: ParsedTransactionRow;
  matchedBookingId: string | null;
}

/**
 * Matches parsed CSV rows to existing bookings by date-within-stay — the
 * transaction date should fall inside [checkIn, checkOut). Rows matching no
 * booking are reported, not silently dropped or turned into a duplicate
 * booking (spec §5b: map to *existing* Booking records to backfill
 * gross_amount "without creating duplicate bookings").
 */
export function matchTransactionsToBookings(
  rows: ParsedTransactionRow[],
  bookings: BookingCandidate[]
): MatchResult[] {
  return rows.map((row) => {
    const match = bookings.find(
      (b) => row.date.getTime() >= b.checkIn.getTime() && row.date.getTime() < b.checkOut.getTime()
    );
    return { row, matchedBookingId: match?.id ?? null };
  });
}
