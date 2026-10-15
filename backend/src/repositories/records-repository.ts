import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { records } from "../db/schema.js";

export type RecordRow = typeof records.$inferSelect;
export type RecordValues = Pick<
  typeof records.$inferInsert,
  "date" | "kind" | "incomeType" | "amount" | "title" | "memo"
>;

export async function findRecordsByDateRange(from: string, to: string): Promise<RecordRow[]> {
  return db
    .select()
    .from(records)
    .where(and(gte(records.date, from), lte(records.date, to)))
    .orderBy(asc(records.date), asc(records.id));
}

export async function insertRecord(values: RecordValues): Promise<RecordRow> {
  const [row] = await db.insert(records).values(values).returning();
  return row;
}

export async function updateRecordById(
  id: number,
  values: RecordValues,
): Promise<RecordRow | undefined> {
  const [row] = await db
    .update(records)
    .set({ ...values, updatedAt: sql`now()` })
    .where(eq(records.id, id))
    .returning();
  return row;
}

export async function deleteRecordById(id: number): Promise<boolean> {
  const rows = await db.delete(records).where(eq(records.id, id)).returning({ id: records.id });
  return rows.length > 0;
}
