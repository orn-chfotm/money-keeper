import { Router } from "express";
import { z } from "zod";
import { INCOME_TYPES, MAX_AMOUNT, MAX_MEMO_LENGTH, RECORD_KINDS } from "../db/schema.js";
import { daysBetween, isValidDate } from "../domain/date.js";
import { notFound } from "../errors.js";
import type { RecordRow } from "../repositories/records-repository.js";
import {
  createRecord,
  deleteRecord,
  listRecords,
  updateRecord,
} from "../services/records-service.js";

// Inclusive range: a full leap year is the longest allowed span.
const MAX_RANGE_DAYS = 366;

const dateSchema = z.string().refine(isValidDate, "Must be a valid date in YYYY-MM-DD format");

const recordInputSchema = z
  .object({
    date: dateSchema,
    kind: z.enum(RECORD_KINDS),
    incomeType: z.enum(INCOME_TYPES).nullable().default(null),
    amount: z.number().int().positive().max(MAX_AMOUNT),
    // Count code points to match PostgreSQL char_length.
    memo: z
      .string()
      .refine(
        (memo) => [...memo].length <= MAX_MEMO_LENGTH,
        `Must be at most ${MAX_MEMO_LENGTH} characters`,
      )
      .default(""),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "income" && value.incomeType === null) {
      ctx.addIssue({
        code: "custom",
        path: ["incomeType"],
        message: "Required when kind is income",
      });
    }
    if (value.kind !== "income" && value.incomeType !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["incomeType"],
        message: "Must be null unless kind is income",
      });
    }
  });

const rangeQuerySchema = z
  .object({ from: dateSchema, to: dateSchema })
  .superRefine(({ from, to }, ctx) => {
    if (from > to) {
      ctx.addIssue({ code: "custom", path: ["to"], message: "Must be on or after from" });
    } else if (daysBetween(from, to) + 1 > MAX_RANGE_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: `Range must be at most ${MAX_RANGE_DAYS} days`,
      });
    }
  });

export type RecordDto = {
  id: number;
  date: string;
  kind: RecordRow["kind"];
  incomeType: RecordRow["incomeType"];
  amount: number;
  memo: string;
};

// The only place DB rows are turned into API responses.
export function toRecordDto(row: RecordRow): RecordDto {
  return {
    id: row.id,
    date: row.date,
    kind: row.kind,
    incomeType: row.incomeType,
    amount: row.amount,
    memo: row.memo,
  };
}

// Anything that is not a positive safe integer cannot be an existing record.
function parseId(raw: string): number {
  if (!/^[1-9]\d*$/.test(raw)) {
    throw notFound("Record not found");
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) {
    throw notFound("Record not found");
  }
  return id;
}

export const recordsRouter = Router();

recordsRouter.get("/records", async (req, res) => {
  const { from, to } = rangeQuerySchema.parse(req.query);
  const rows = await listRecords(from, to);
  res.status(200).json({ items: rows.map(toRecordDto) });
});

recordsRouter.post("/records", async (req, res) => {
  const values = recordInputSchema.parse(req.body);
  const row = await createRecord(values);
  res.status(201).json(toRecordDto(row));
});

recordsRouter.put("/records/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const values = recordInputSchema.parse(req.body);
  const row = await updateRecord(id, values);
  res.status(200).json(toRecordDto(row));
});

recordsRouter.delete("/records/:id", async (req, res) => {
  const id = parseId(req.params.id);
  await deleteRecord(id);
  res.status(204).end();
});
