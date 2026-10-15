"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatAmount } from "@/lib/amount";
import type { RecordDto } from "@/lib/records-api";
import { cn } from "@/lib/utils";
import { INCOME_TYPE_LABELS, KIND_LABELS, KIND_TEXT_CLASSES } from "./labels";

function kindLabel(record: RecordDto): string {
  const kind = KIND_LABELS[record.kind];
  return record.incomeType ? `${kind}·${INCOME_TYPE_LABELS[record.incomeType]}` : kind;
}

type RecordListProps = {
  // Records of a single day, shown in server order (registration order).
  records: RecordDto[];
  onEdit: (record: RecordDto) => void;
  onDelete: (record: RecordDto) => void;
};

export function RecordList({ records, onEdit, onDelete }: RecordListProps) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">이 날의 기록이 없습니다.</p>;
  }

  return (
    <ul className="grid gap-2">
      {records.map((record) => (
        <li
          key={record.id}
          className="flex items-center justify-between gap-2 rounded-lg border p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{record.title}</p>
            <p className="text-sm">
              <span className={cn("font-medium", KIND_TEXT_CLASSES[record.kind])}>
                {kindLabel(record)}
              </span>{" "}
              {formatAmount(record.amount)}원
            </p>
            {record.memo && (
              <p className="truncate text-sm text-muted-foreground">{record.memo}</p>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="outline" size="sm" onClick={() => onEdit(record)}>
              수정
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>이 기록을 삭제할까요?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {record.date} {kindLabel(record)} {record.title} {formatAmount(record.amount)}원
                    기록을 삭제합니다. 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => onDelete(record)}>
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </li>
      ))}
    </ul>
  );
}
