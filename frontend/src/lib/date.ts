// Dates are handled as "YYYY-MM-DD" strings only.

export type YearMonth = { year: number; month: number };

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// The only place the FE computes "today" (KST). Used for the form's default date and the first month shown.
export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

// True only for "YYYY-MM-DD" strings that exist on the calendar (e.g. rejects 2026-02-30).
export function isValidDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function monthOfDate(date: string): YearMonth {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

// Inclusive first and last day of the month.
export function monthRange({ year, month }: YearMonth): { from: string; to: string } {
  const lastDay = new Date(0);
  lastDay.setUTCFullYear(year, month, 0);
  const prefix = `${pad(year, 4)}-${pad(month, 2)}`;
  return { from: `${prefix}-01`, to: `${prefix}-${pad(lastDay.getUTCDate(), 2)}` };
}

export type CalendarDay = {
  date: string;
  day: number;
  // False for the previous/next month days that pad the first and last week.
  inMonth: boolean;
};

// Same meaning as YearMonth, so the DTO reuses it.
export type BuildMonthGridRequestDto = YearMonth;

export type BuildMonthGridResponseDto = { weeks: CalendarDay[][] };

const DAYS_PER_WEEK = 7;

// Sunday-first weeks covering the whole month, padded with adjacent-month days (UTC-based).
export function buildMonthGrid({ year, month }: BuildMonthGridRequestDto): BuildMonthGridResponseDto {
  const first = new Date(0);
  first.setUTCFullYear(year, month - 1, 1);
  const leading = first.getUTCDay();
  const last = new Date(0);
  last.setUTCFullYear(year, month, 0);
  const cellCount = Math.ceil((leading + last.getUTCDate()) / DAYS_PER_WEEK) * DAYS_PER_WEEK;

  const weeks: CalendarDay[][] = [];
  for (let index = 0; index < cellCount; index++) {
    const cell = new Date(0);
    cell.setUTCFullYear(year, month - 1, 1 - leading + index);
    if (index % DAYS_PER_WEEK === 0) weeks.push([]);
    weeks[weeks.length - 1].push({
      date: `${pad(cell.getUTCFullYear(), 4)}-${pad(cell.getUTCMonth() + 1, 2)}-${pad(cell.getUTCDate(), 2)}`,
      day: cell.getUTCDate(),
      inMonth: cell.getUTCMonth() === month - 1,
    });
  }
  return { weeks };
}
