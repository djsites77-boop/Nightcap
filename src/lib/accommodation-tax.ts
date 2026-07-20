/**
 * Host-facing labels for lodging / accommodation tax, derived from the
 * property's province — never a hardcoded city name.
 *
 * Internal code may still say "mat" (ledger table, ruleType) as the domain
 * model; UI and emails should use these helpers.
 */

export function accommodationTaxShortLabel(province: string): string {
  switch (province.trim().toUpperCase()) {
    case "ON":
      return "MAT";
    case "BC":
      return "MRDT";
    case "AB":
      return "Tourism levy";
    case "QC":
      return "Lodging tax";
    default:
      return "Tax";
  }
}

export function accommodationTaxFullName(province: string): string {
  switch (province.trim().toUpperCase()) {
    case "ON":
      return "Municipal Accommodation Tax";
    case "BC":
      return "Municipal and Regional District Tax";
    case "AB":
      return "Alberta Tourism Levy";
    case "QC":
      return "lodging tax";
    default:
      return "accommodation tax";
  }
}

/** e.g. "Toronto's" / "Niagara Falls'" */
export function possessiveName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "This municipality's";
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
}
