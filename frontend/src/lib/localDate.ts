/**
 * "Today" and date formatting in the OBSERVATION's time zone, not the
 * browser's: a reader in Jakarta looking at Jayapura should get Jayapura's
 * date and clock. Pure formatting - no astronomy.
 */
export function todayIsoIn(timeZone: string | null): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone ?? undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // en-CA formats as YYYY-MM-DD
}

export function shiftIsoDate(dateIso: string, days: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

/** "Minggu, 27 September 2026" - the date as a label, not a timestamp. */
export function formatLongDate(dateIso: string, options: Intl.DateTimeFormatOptions = {}): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "17.48" - an engine instant (microseconds since epoch) as local clock time. */
export function formatClock(instantUs: number | null, timeZone: string | null): string {
  if (instantUs === null) return "—";
  return new Date(instantUs / 1000).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone ?? undefined,
  });
}

/** Same, from an ISO timestamp string as the api layer returns them. */
export function formatClockIso(iso: string | null | undefined, timeZone: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: timeZone ?? undefined });
}

/** WIB / WITA / WIT for the three Indonesian zones, else the IANA name. */
export function zoneAbbreviation(timeZone: string | null): string {
  switch (timeZone) {
    case "Asia/Jakarta":
    case "Asia/Pontianak":
      return "WIB";
    case "Asia/Makassar":
      return "WITA";
    case "Asia/Jayapura":
      return "WIT";
    default:
      return timeZone ?? "UTC";
  }
}
