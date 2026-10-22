"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteRecord, type RecordDto, type RecordKind } from "@/lib/records-api";
import { cn } from "@/lib/utils";
import { KIND_LABELS, KIND_TEXT_CLASSES } from "./labels";
import { RecordList } from "./record-list";

const KINDS: RecordKind[] = ["income", "expense", "saving"];

type DayPanelProps = {
  // "YYYY-MM-DD" selected on the calendar.
  date: string;
  // Records of that date in server order; kept as-is inside each kind section.
  records: RecordDto[];
  isLoading: boolean;
  error: string | null;
  onCreate: () => void;
  onEdit: (record: RecordDto) => void;
  onDeleted: () => void;
};

// Detail of the selected date below the calendar. Remount it per date so a delete error never carries over.
export function DayPanel({
  date,
  records,
  isLoading,
  error,
  onCreate,
  onEdit,
  onDeleted,
}: DayPanelProps) {
  const headingId = useId();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const dateLabel = `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
  const sections = useMemo(
    () =>
      KINDS.map((kind) => ({ kind, items: records.filter((record) => record.kind === kind) })).filter(
        (section) => section.items.length > 0,
      ),
    [records],
  );

  async function handleDelete(record: RecordDto) {
    setDeleteError(null);
    try {
      await deleteRecord(record.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    } finally {
      onDeleted();
    }
  }

  let emptyMessage: string | null = null;
  if (records.length === 0) {
    if (error) emptyMessage = "기록을 불러오지 못했습니다.";
    else if (isLoading) emptyMessage = "불러오는 중…";
    else emptyMessage = "이 날의 기록이 없습니다.";
  }

  return (
    <section aria-labelledby={headingId} className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-base font-semibold">
          {dateLabel}
        </h2>
        <Button
          size="sm"
          className="bg-brand text-white hover:bg-brand-hover"
          onClick={() => {
            setDeleteError(null);
            onCreate();
          }}
        >
          등록
        </Button>
      </div>
      {deleteError && (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      )}
      {emptyMessage && <p className="text-sm text-muted-foreground">{emptyMessage}</p>}
      {sections.map(({ kind, items }) => (
        <section key={kind} aria-labelledby={`${headingId}-${kind}`} className="grid gap-2">
          <h3
            id={`${headingId}-${kind}`}
            className={cn("text-sm font-semibold", KIND_TEXT_CLASSES[kind])}
          >
            {KIND_LABELS[kind]}
          </h3>
          <RecordList
            records={items}
            onEdit={(record) => {
              setDeleteError(null);
              onEdit(record);
            }}
            onDelete={handleDelete}
          />
        </section>
      ))}
    </section>
  );
}
