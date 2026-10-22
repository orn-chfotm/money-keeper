"use client";

import { useMemo } from "react";
import { buildMonthGrid, type CalendarDay, type YearMonth } from "@/lib/date";
import type { RecordDto, RecordKind } from "@/lib/records-api";
import { cn } from "@/lib/utils";
import { KIND_BADGE_CLASSES, KIND_LABELS, KIND_SHORT_LABELS, KIND_TEXT_CLASSES } from "./labels";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const KINDS: RecordKind[] = ["income", "expense", "saving"];

// Index in a Sunday-first week -> weekend marker; only applied to current-month cells and the header.
type Weekend = "sun" | "sat";
const WEEKEND_BY_INDEX: Partial<Record<number, Weekend>> = { 0: "sun", 6: "sat" };
const WEEKEND_TEXT_CLASSES: Record<Weekend, string> = {
  sun: "text-red-600 dark:text-red-400",
  sat: "text-blue-600 dark:text-blue-400",
};

type KindCounts = Record<RecordKind, number>;
const NO_COUNTS: KindCounts = { income: 0, expense: 0, saving: 0 };

type CalendarGridProps = {
  month: YearMonth;
  // Records of the shown month; only counted per date and kind here.
  records: RecordDto[];
  // "YYYY-MM-DD" of the selected cell and of today (KST).
  selectedDate: string;
  today: string;
  onSelectDate: (date: string) => void;
};

export function CalendarGrid({
  month,
  records,
  selectedDate,
  today,
  onSelectDate,
}: CalendarGridProps) {
  const { weeks } = buildMonthGrid(month);
  const countsByDate = useMemo(() => {
    const byDate = new Map<string, KindCounts>();
    for (const record of records) {
      const counts = byDate.get(record.date) ?? { ...NO_COUNTS };
      counts[record.kind] += 1;
      byDate.set(record.date, counts);
    }
    return byDate;
  }, [records]);

  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground" aria-hidden>
        {WEEKDAYS.map((weekday, index) => {
          const weekend = WEEKEND_BY_INDEX[index];
          return (
            <span
              key={weekday}
              data-weekend={weekend}
              className={cn(weekend && WEEKEND_TEXT_CLASSES[weekend])}
            >
              {weekday}
            </span>
          );
        })}
      </div>
      {weeks.map((week) => (
        <div key={week[0].date} className="grid grid-cols-7 gap-1">
          {week.map((cell, index) =>
            cell.inMonth ? (
              <DayCell
                key={cell.date}
                cell={cell}
                month={month.month}
                counts={countsByDate.get(cell.date) ?? NO_COUNTS}
                weekend={WEEKEND_BY_INDEX[index]}
                isSelected={cell.date === selectedDate}
                isToday={cell.date === today}
                onSelect={() => onSelectDate(cell.date)}
              />
            ) : (
              <div
                key={cell.date}
                aria-hidden
                data-testid="calendar-filler"
                className="min-h-16 rounded-md p-1 text-xs text-muted-foreground/50 sm:min-h-24"
              >
                {cell.day}
              </div>
            ),
          )}
        </div>
      ))}
    </div>
  );
}

type DayCellProps = {
  cell: CalendarDay;
  month: number;
  counts: KindCounts;
  weekend: Weekend | undefined;
  isSelected: boolean;
  isToday: boolean;
  onSelect: () => void;
};

function DayCell({ cell, month, counts, weekend, isSelected, isToday, onSelect }: DayCellProps) {
  const shown = KINDS.filter((kind) => counts[kind] > 0);
  const summary =
    shown.length > 0
      ? shown.map((kind) => `${KIND_LABELS[kind]} ${counts[kind]}건`).join(" ")
      : "기록 없음";

  return (
    <button
      type="button"
      aria-label={`${month}월 ${cell.day}일, ${summary}`}
      aria-pressed={isSelected}
      aria-current={isToday ? "date" : undefined}
      data-weekend={weekend}
      onClick={onSelect}
      className={cn(
        "flex min-h-16 min-w-0 flex-col items-stretch gap-1 rounded-md border p-1 text-left text-xs transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-24",
        isSelected && "border-amber-500 bg-amber-50 hover:bg-amber-100/60 dark:border-amber-400 dark:bg-amber-500/15 dark:hover:bg-amber-500/20",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-5 items-center justify-center self-start rounded-full font-medium",
          weekend && WEEKEND_TEXT_CLASSES[weekend],
          isToday && "ring-1 ring-amber-500 dark:ring-amber-400",
        )}
      >
        {cell.day}
      </span>

      {/* Only phrasing content (span) inside the button. Wide screens: one "수입 N건" line per kind */}
      {shown.length > 0 && (
        <span aria-hidden className="hidden min-w-0 gap-0.5 sm:grid">
          {shown.map((kind) => (
            <span
              key={kind}
              data-testid="calendar-count"
              className={cn("leading-tight font-medium", KIND_TEXT_CLASSES[kind])}
            >
              {KIND_LABELS[kind]} {counts[kind]}건
            </span>
          ))}
        </span>
      )}

      {/* Narrow screens: colored badges that keep the kind letter, e.g. "수1" */}
      {shown.length > 0 && (
        <span aria-hidden className="flex flex-wrap items-center gap-0.5 sm:hidden">
          {shown.map((kind) => (
            <span
              key={kind}
              data-testid="calendar-badge"
              className={cn(
                "inline-flex h-4 items-center justify-center rounded-sm px-0.5 text-[10px] leading-none",
                KIND_BADGE_CLASSES[kind],
              )}
            >
              {KIND_SHORT_LABELS[kind]}
              {counts[kind]}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
