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
