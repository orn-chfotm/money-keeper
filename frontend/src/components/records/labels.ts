import type { IncomeType, RecordKind } from "@/lib/records-api";

export const KIND_LABELS: Record<RecordKind, string> = {
  income: "수입",
  expense: "지출",
  saving: "저축",
};

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  salary: "급여",
  other: "기타",
};

// One-letter kind marks for narrow calendar cells; always shown with the color, never color alone.
export const KIND_SHORT_LABELS: Record<RecordKind, string> = {
  income: "수",
  expense: "지",
  saving: "저",
};

// Kind colors: income green, expense red, saving blue.
export const KIND_TEXT_CLASSES: Record<RecordKind, string> = {
  income: "text-green-700 dark:text-green-400",
  expense: "text-red-600 dark:text-red-400",
  saving: "text-blue-600 dark:text-blue-400",
};

export const KIND_BADGE_CLASSES: Record<RecordKind, string> = {
  income: "bg-green-600 text-white",
  expense: "bg-red-600 text-white",
  saving: "bg-blue-600 text-white",
};
