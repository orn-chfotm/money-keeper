"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRecords } from "@/hooks/use-records";
import { monthOfDate, monthRange, todayKst, type YearMonth } from "@/lib/date";
import type { RecordDto } from "@/lib/records-api";
import { CalendarGrid } from "./calendar-grid";
import { DayPanel } from "./day-panel";
import { MonthNav } from "./month-nav";
import { RecordForm } from "./record-form";

const noopSubscribe = () => () => {};

// What the form dialog edits; kept while the dialog animates closed.
type FormTarget = { mode: "create" } | { mode: "edit"; record: RecordDto };

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
  const [formOpen, setFormOpen] = useState(false);
  const [formTarget, setFormTarget] = useState<FormTarget>({ mode: "create" });
  // Remounts the form on every open so it always starts from the target's values.
  const [formSession, setFormSession] = useState(0);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const { from, to } = monthRange(month);
  const { records, error, isLoading, reload } = useRecords(from, to);

  function openForm(target: FormTarget) {
    setFormTarget(target);
    setFormSession((session) => session + 1);
    setFormOpen(true);
  }

  function changeMonth(next: YearMonth) {
    setSavedNotice(null);
    setMonth(next);
    // Today's month selects today; any other month selects its first day.
    const current = monthOfDate(today);
    setSelectedDate(
      current.year === next.year && current.month === next.month ? today : monthRange(next).from,
    );
  }

  function handleSaved(record: RecordDto) {
    setFormOpen(false);
    reload();
    // Stay on the month and date being viewed; only tell the user where the record went.
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
      <CalendarGrid
        month={month}
        records={records}
        selectedDate={selectedDate}
        today={today}
        onSelectDate={setSelectedDate}
      />
      <DayPanel
        key={selectedDate}
        date={selectedDate}
        records={records.filter((record) => record.date === selectedDate)}
        isLoading={isLoading}
        error={error}
        onCreate={() => openForm({ mode: "create" })}
        onEdit={(record) => openForm({ mode: "edit", record })}
        onDeleted={reload}
      />
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        {/* No description: the editable date field already shows the date. */}
        <DialogContent className="max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{formTarget.mode === "edit" ? "기록 수정" : "기록 등록"}</DialogTitle>
          </DialogHeader>
          <RecordForm
            key={formSession}
            record={formTarget.mode === "edit" ? formTarget.record : undefined}
            defaultDate={selectedDate}
            onSaved={handleSaved}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
