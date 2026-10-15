const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toUtcTime(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  // setUTCFullYear avoids Date.UTC mapping years 0-99 to 1900-1999.
  date.setUTCFullYear(year, month - 1, day);
  return date.getTime();
}

// "YYYY-MM-DD" that exists on the calendar (rejects e.g. 2026-02-30, 2027-02-29, year 0000).
export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1) {
    return false;
  }
  const date = new Date(toUtcTime(value));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Number of days from `from` to `to` (both valid dates). Same day is 0.
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcTime(to) - toUtcTime(from)) / DAY_MS);
}

// Today's date in Asia/Seoul (no DST) as "YYYY-MM-DD".
export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}
