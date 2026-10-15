import { sql } from "drizzle-orm";
import { bigint, check, date, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const RECORD_KINDS = ["income", "expense", "saving"] as const;
export const INCOME_TYPES = ["salary", "other"] as const;
export const MAX_AMOUNT = 999_999_999;
export const MAX_MEMO_LENGTH = 200;
export const MAX_TITLE_LENGTH = 50;

// Plain text + CHECK instead of PG enums, so values can be added or removed later.
export const records = pgTable(
  "records",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    date: date("date", { mode: "string" }).notNull(),
    kind: text("kind", { enum: RECORD_KINDS }).notNull(),
    incomeType: text("income_type", { enum: INCOME_TYPES }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    // No DEFAULT: every record must have a real title.
    title: text("title").notNull(),
    memo: text("memo").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("records_kind_check", sql`${table.kind} IN ('income', 'expense', 'saving')`),
    check(
      "records_income_type_check",
      sql`${table.incomeType} IS NULL OR ${table.incomeType} IN ('salary', 'other')`,
    ),
    check(
      "records_income_type_kind_check",
      sql`(${table.kind} = 'income') = (${table.incomeType} IS NOT NULL)`,
    ),
    check(
      "records_amount_check",
      sql`${table.amount} > 0 AND ${table.amount} <= ${sql.raw(String(MAX_AMOUNT))}`,
    ),
    check(
      "records_memo_length_check",
      sql`char_length(${table.memo}) <= ${sql.raw(String(MAX_MEMO_LENGTH))}`,
    ),
    check(
      "records_title_check",
      sql`btrim(${table.title}) <> '' AND char_length(${table.title}) <= ${sql.raw(String(MAX_TITLE_LENGTH))}`,
    ),
    index("records_date_idx").on(table.date),
  ],
);
