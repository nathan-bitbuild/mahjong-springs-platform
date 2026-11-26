/** Fold a wall-clock time in an IANA zone into a UTC Date. */
export function zonedLocalToUtc(local: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new Error("Use a date and time like 2027-01-15T18:00.");
  const [, ys, ms, ds, hs, mins] = match;
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const h = Number(hs);
  const min = Number(mins);
  const utcGuess = new Date(Date.UTC(y, m - 1, d, h, min));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(utcGuess).map((part) => [part.type, part.value]));
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour, Number(parts.minute));
  return new Date(utcGuess.getTime() - (asUtc - utcGuess.getTime()));
}

export function formatInZone(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date);
}

export const TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export function weeksBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
}
