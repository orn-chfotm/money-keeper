"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteRecord, type RecordDto } from "@/lib/records-api";
import { RecordForm } from "./record-form";
import { RecordList } from "./record-list";

// One dialog switches between the day's list and the create/edit form.
type View = { mode: "list" } | { mode: "create" } | { mode: "edit"; record: RecordDto };

type DayDialogProps = {
  open: boolean;
  // "YYYY-MM-DD" picked on the calendar; also the default date of a new record.
  date: string;
  // Records of that date in server order.
  records: RecordDto[];
  onOpenChange: (open: boolean) => void;
  onSaved: (record: RecordDto) => void;
  onDeleted: () => void;
};

export function DayDialog({
  open,
  date,
  records,
  onOpenChange,
  onSaved,
  onDeleted,
}: DayDialogProps) {
  const [view, setView] = useState<View>({ mode: "list" });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const dateLabel = `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;

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

  const backToList = () => setView({ mode: "list" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {view.mode === "list" ? (
          <>
            <DialogHeader>
              <DialogTitle>{dateLabel}</DialogTitle>
              <DialogDescription>기록 {records.length}건</DialogDescription>
            </DialogHeader>
            <div>
              <Button
                size="sm"
                onClick={() => {
                  setDeleteError(null);
                  setView({ mode: "create" });
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
            <RecordList
              records={records}
              onEdit={(record) => {
                setDeleteError(null);
                setView({ mode: "edit", record });
              }}
              onDelete={handleDelete}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{view.mode === "edit" ? "기록 수정" : "기록 등록"}</DialogTitle>
              <DialogDescription>{dateLabel}</DialogDescription>
            </DialogHeader>
            <RecordForm
              key={view.mode === "edit" ? `edit-${view.record.id}` : "create"}
              record={view.mode === "edit" ? view.record : undefined}
              defaultDate={date}
              onSaved={onSaved}
              onCancel={backToList}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
