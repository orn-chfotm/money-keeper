"use client";

import { useMemo } from "react";
import { formatAmount } from "@/lib/amount";
import { buildMonthGrid, type CalendarDay, type YearMonth } from "@/lib/date";
import type { RecordDto } from "@/lib/records-api";
import { truncateText } from "@/lib/text";
import { cn } from "@/lib/utils";
import { KIND_BADGE_CLASSES, KIND_LABELS, KIND_SHORT_LABELS, KIND_TEXT_CLASSES } from "./labels";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_VISIBLE_RECORDS = 3;
const MAX_TITLE_LENGTH = 10;

type CalendarGridProps = {
  month: YearMonth;
  // Records of the shown month in server order (date ASC, id ASC); kept as-is per cell.
  records: RecordDto[];
  onSelectDate: (date: string) => void;
};

export function CalendarGrid({ month, records, onSelectDate }: CalendarGridProps) {
  const { weeks } = buildMonthGrid(month);
  const recordsByDate = useMemo(() => {
    const byDate = new Map<string, RecordDto[]>();
    for (const record of records) {
      const items = byDate.get(record.date);
      if (items) items.push(record);
      else byDate.set(record.date, [record]);
    }
    return byDate;
  }, [records]);

  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground" aria-hidden>
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0].date} className="grid grid-cols-7 gap-1">
          {week.map((cell) =>
            cell.inMonth ? (
              <DayCell
                key={cell.date}
                cell={cell}
                month={month.month}
                records={recordsByDate.get(cell.date) ?? []}
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
  records: RecordDto[];
  onSelect: () => void;
};

function DayCell({ cell, month, records, onSelect }: DayCellProps) {
  const visible = records.slice(0, MAX_VISIBLE_RECORDS);
  const hiddenCount = records.length - visible.length;

  return (
    <button
      type="button"
      aria-label={`${month}월 ${cell.day}일, 기록 ${records.length}건`}
      onClick={onSelect}
      className="flex min-h-16 min-w-0 flex-col items-stretch gap-1 rounded-md border p-1 text-left text-xs transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-24"
    >
      <span aria-hidden className="font-medium">
        {cell.day}
      </span>

      {/* Only phrasing content (span) inside the button. Wide screens: kind · title · amount */}
      {records.length > 0 && (
        <span aria-hidden className="hidden min-w-0 gap-0.5 sm:grid">
          {visible.map((record) => (
            <span key={record.id} data-testid="calendar-entry" className="leading-tight break-all">
              <span className={cn("font-medium", KIND_TEXT_CLASSES[record.kind])}>
                {KIND_LABELS[record.kind]}
              </span>
              {" · "}
              {truncateText({ text: record.title, maxLength: MAX_TITLE_LENGTH }).text}
              {" · "}
              {formatAmount(record.amount)}원
            </span>
          ))}
          {hiddenCount > 0 && (
            <span data-testid="calendar-entry" className="text-muted-foreground">
              외 {hiddenCount}건
            </span>
          )}
        </span>
      )}

      {/* Narrow screens: colored kind marks only */}
      {records.length > 0 && (
        <span aria-hidden className="flex flex-wrap items-center gap-0.5 sm:hidden">
          {visible.map((record) => (
            <span
              key={record.id}
              className={cn(
                "inline-flex size-4 items-center justify-center rounded-sm text-[10px] leading-none",
                KIND_BADGE_CLASSES[record.kind],
              )}
            >
              {KIND_SHORT_LABELS[record.kind]}
            </span>
          ))}
          {hiddenCount > 0 && <span className="text-muted-foreground">+{hiddenCount}</span>}
        </span>
      )}
    </button>
  );
}
