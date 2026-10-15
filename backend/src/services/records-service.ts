import { notFound } from "../errors.js";
import {
  deleteRecordById,
  findRecordsByDateRange,
  insertRecord,
  updateRecordById,
  type RecordRow,
  type RecordValues,
} from "../repositories/records-repository.js";

export function listRecords(from: string, to: string): Promise<RecordRow[]> {
  return findRecordsByDateRange(from, to);
}

export function createRecord(values: RecordValues): Promise<RecordRow> {
  return insertRecord(values);
}

// Last write wins: no version check.
export async function updateRecord(id: number, values: RecordValues): Promise<RecordRow> {
  const row = await updateRecordById(id, values);
  if (!row) {
    throw notFound("Record not found");
  }
  return row;
}

export async function deleteRecord(id: number): Promise<void> {
  const deleted = await deleteRecordById(id);
  if (!deleted) {
    throw notFound("Record not found");
  }
}
