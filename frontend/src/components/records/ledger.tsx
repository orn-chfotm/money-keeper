"use client";

import { useState, useSyncExternalStore } from "react";
import { useRecords } from "@/hooks/use-records";
import { monthOfDate, monthRange, todayKst, type YearMonth } from "@/lib/date";
import { deleteRecord, type RecordDto } from "@/lib/records-api";
import { MonthNav } from "./month-nav";
import { RecordForm } from "./record-form";
import { RecordList } from "./record-list";

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
  const [editing, setEditing] = useState<RecordDto | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const { from, to } = monthRange(month);
  const { records, error, isLoading, reload } = useRecords(from, to);

  function closeForm() {
    setEditing(null);
    setFormKey((k) => k + 1);
  }

  function handleSaved() {
    closeForm();
    reload();
  }

  async function handleDelete(record: RecordDto) {
    setActionError(null);
    try {
      await deleteRecord(record.id);
      if (editing?.id === record.id) closeForm();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    } finally {
      reload();
    }
  }

  return (
    <div className="grid gap-6">
      <RecordForm
        key={editing ? `edit-${editing.id}-${formKey}` : `new-${formKey}`}
        record={editing ?? undefined}
        defaultDate={today}
        onSaved={handleSaved}
        onCancel={editing ? closeForm : undefined}
      />

      <section className="grid gap-4">
        <MonthNav month={month} onChange={setMonth} />
        {actionError && (
          <p role="alert" className="text-sm text-destructive">
            {actionError}
          </p>
        )}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            기록을 불러오지 못했습니다: {error}
          </p>
        ) : isLoading && records.length === 0 ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : (
          <RecordList
            records={records}
            onEdit={(record) => {
              setActionError(null);
              setEditing(record);
            }}
            onDelete={handleDelete}
          />
        )}
      </section>
    </div>
  );
}
