"use client";

import { useState, useSyncExternalStore } from "react";
import { useRecords } from "@/hooks/use-records";
import { monthOfDate, monthRange, todayKst, type YearMonth } from "@/lib/date";
import type { RecordDto } from "@/lib/records-api";
import { CalendarGrid } from "./calendar-grid";
import { DayDialog } from "./day-dialog";
import { MonthNav } from "./month-nav";

const noopSubscribe = () => () => {};

export function Ledger() {
  // Read "today" only in the browser: cacheComponents forbids reading the clock during prerender.
  const today = useSyncExternalStore(noopSubscribe, todayKst, () => null);
  if (today === null) {
    return <p className="text-sm text-muted-foreground">불러오는 중…</p>;
  }
  return <LedgerView today={today} />;
}

function LedgerView({ today }: { today: string }) {
  const [month, setMonth] = useState<YearMonth>(() => monthOfDate(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Remounts the dialog on every open so it always starts on the list view.
  const [dialogSession, setDialogSession] = useState(0);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const { from, to } = monthRange(month);
  const { records, error, isLoading, reload } = useRecords(from, to);

  function openDay(date: string) {
    setSelectedDate(date);
    setDialogSession((session) => session + 1);
    setDialogOpen(true);
  }

  function changeMonth(next: YearMonth) {
    setSavedNotice(null);
    setMonth(next);
  }

  function handleSaved(record: RecordDto) {
    setDialogOpen(false);
    reload();
    // Stay on the month being viewed; only tell the user where the record went.
    const saved = monthOfDate(record.date);
    setSavedNotice(
      saved.year === month.year && saved.month === month.month
        ? null
        : `${saved.month}월에 저장되었습니다`,
    );
  }

  return (
    <section className="grid gap-4">
      <MonthNav month={month} onChange={changeMonth} />
      {savedNotice && (
        <p role="status" className="text-sm text-muted-foreground">
          {savedNotice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          기록을 불러오지 못했습니다: {error}
        </p>
      )}
      {isLoading && records.length === 0 && (
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      )}
      <CalendarGrid month={month} records={records} onSelectDate={openDay} />
      <DayDialog
        key={dialogSession}
        open={dialogOpen}
        date={selectedDate}
        records={records.filter((record) => record.date === selectedDate)}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
        onDeleted={reload}
      />
    </section>
  );
}
