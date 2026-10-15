"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MAX_AMOUNT, formatAmount, parseAmount, sanitizeAmountInput } from "@/lib/amount";
import { isValidDate } from "@/lib/date";
import {
  ApiError,
  createRecord,
  updateRecord,
  type IncomeType,
  type RecordDto,
  type RecordInput,
  type RecordKind,
} from "@/lib/records-api";
import { countCodePoints } from "@/lib/text";
import { INCOME_TYPE_LABELS, KIND_LABELS } from "./labels";

const MAX_TITLE_LENGTH = 50;
const MAX_MEMO_LENGTH = 200;
const KINDS: RecordKind[] = ["income", "expense", "saving"];
const INCOME_TYPES: IncomeType[] = ["salary", "other"];

type Values = {
  date: string;
  kind: RecordKind;
  incomeType: IncomeType | "";
  amount: string;
  title: string;
  memo: string;
};

type FieldErrors = Partial<Record<"date" | "incomeType" | "amount" | "title" | "memo", string>>;

function validate(values: Values): FieldErrors {
  const errors: FieldErrors = {};
  if (values.date === "") errors.date = "날짜를 입력하세요.";
  else if (!isValidDate(values.date)) errors.date = "달력에 있는 날짜를 입력하세요.";

  if (values.kind === "income" && values.incomeType === "") {
    errors.incomeType = "수입 종류(급여·기타)를 선택하세요.";
  }

  const amount = parseAmount(values.amount);
  if (amount === null) errors.amount = "금액을 입력하세요.";
  else if (amount < 1) errors.amount = "금액은 1원 이상이어야 합니다.";
  else if (amount > MAX_AMOUNT) errors.amount = "금액은 10억 원 미만이어야 합니다.";

  // Matches the server: trimmed, counted in code points so an emoji is one character.
  const { length: title } = countCodePoints({ text: values.title.trim() });
  if (title === 0) errors.title = "제목을 입력하세요.";
  else if (title > MAX_TITLE_LENGTH) errors.title = `제목은 ${MAX_TITLE_LENGTH}자 이하로 입력하세요.`;

  if (values.memo.length > MAX_MEMO_LENGTH) {
    errors.memo = `메모는 ${MAX_MEMO_LENGTH}자 이하로 입력하세요.`;
  }
  return errors;
}

function toInput(values: Values): RecordInput {
  return {
    date: values.date,
    kind: values.kind,
    incomeType: values.kind === "income" ? (values.incomeType as IncomeType) : null,
    amount: Number(values.amount),
    title: values.title.trim(),
    memo: values.memo,
  };
}

function initialValues(record: RecordDto | undefined, defaultDate: string): Values {
  if (!record) {
    return { date: defaultDate, kind: "expense", incomeType: "", amount: "", title: "", memo: "" };
  }
  return {
    date: record.date,
    kind: record.kind,
    incomeType: record.incomeType ?? "",
    amount: String(record.amount),
    title: record.title,
    memo: record.memo,
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

type RecordFormProps = {
  // When given, the form edits this record; otherwise it creates a new one.
  record?: RecordDto;
  // Prefilled date for a new record (the date picked on the calendar); still editable.
  defaultDate: string;
  onSaved: (record: RecordDto) => void;
  onCancel?: () => void;
};

export function RecordForm({ record, defaultDate, onSaved, onCancel }: RecordFormProps) {
  const [values, setValues] = useState<Values>(() => initialValues(record, defaultDate));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = record !== undefined;
  const amount = parseAmount(values.amount);
  const { length: titleLength } = countCodePoints({ text: values.title.trim() });

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setServerErrors([]);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const input = toInput(values);
      const saved = isEdit ? await updateRecord(record.id, input) : await createRecord(input);
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerErrors([err.message, ...err.details.map((d) => d.message)]);
      } else {
        setServerErrors(["저장하지 못했습니다. 서버 연결을 확인하세요."]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // No Card wrapper: the form is rendered inside the day dialog, which provides the frame and title.
  return (
    <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-2">
        <Label htmlFor="record-date">날짜</Label>
        <Input
          id="record-date"
          type="date"
          value={values.date}
          onChange={(e) => update("date", e.target.value)}
          aria-invalid={errors.date ? true : undefined}
          aria-describedby={errors.date ? "record-date-error" : undefined}
        />
        <FieldError id="record-date-error" message={errors.date} />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">구분</legend>
        <RadioGroup
          className="flex gap-4"
          value={values.kind}
          onValueChange={(value) => update("kind", value as RecordKind)}
        >
          {KINDS.map((kind) => (
            <div key={kind} className="flex items-center gap-2">
              <RadioGroupItem id={`record-kind-${kind}`} value={kind} />
              <Label htmlFor={`record-kind-${kind}`}>{KIND_LABELS[kind]}</Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      {values.kind === "income" && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">수입 종류</legend>
          <RadioGroup
            className="flex gap-4"
            value={values.incomeType}
            onValueChange={(value) => update("incomeType", value as IncomeType)}
            aria-invalid={errors.incomeType ? true : undefined}
            aria-describedby={errors.incomeType ? "record-income-type-error" : undefined}
          >
            {INCOME_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-2">
                <RadioGroupItem id={`record-income-type-${type}`} value={type} />
                <Label htmlFor={`record-income-type-${type}`}>
                  {INCOME_TYPE_LABELS[type]}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <FieldError id="record-income-type-error" message={errors.incomeType} />
        </fieldset>
      )}

      <div className="grid gap-2">
        <Label htmlFor="record-title">제목</Label>
        <Input
          id="record-title"
          autoComplete="off"
          value={values.title}
          onChange={(e) => update("title", e.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? "record-title-error" : undefined}
        />
        <p className="text-xs text-muted-foreground">
          {titleLength}/{MAX_TITLE_LENGTH}
        </p>
        <FieldError id="record-title-error" message={errors.title} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="record-amount">금액(원)</Label>
        <Input
          id="record-amount"
          inputMode="numeric"
          autoComplete="off"
          value={values.amount}
          onChange={(e) => update("amount", sanitizeAmountInput(e.target.value))}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? "record-amount-error" : undefined}
        />
        {amount !== null && (
          <p className="text-sm text-muted-foreground">{formatAmount(amount)}원</p>
        )}
        <FieldError id="record-amount-error" message={errors.amount} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="record-memo">메모</Label>
        <Input
          id="record-memo"
          value={values.memo}
          onChange={(e) => update("memo", e.target.value)}
          aria-invalid={errors.memo ? true : undefined}
          aria-describedby={errors.memo ? "record-memo-error" : undefined}
        />
        <p className="text-xs text-muted-foreground">
          {values.memo.length}/{MAX_MEMO_LENGTH}
        </p>
        <FieldError id="record-memo-error" message={errors.memo} />
      </div>

      {serverErrors.length > 0 && (
        <div role="alert" className="text-sm text-destructive">
          {serverErrors.map((message, index) => (
            <p key={index}>{message}</p>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "저장 중…" : "저장"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </form>
  );
}
