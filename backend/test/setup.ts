import { sql } from "drizzle-orm";
import { afterAll, beforeEach } from "vitest";
import { db, pool } from "../src/db/client.js";

// global-setup already checks this; repeat it right before TRUNCATE as a last line of defense.
const databaseName = decodeURIComponent(new URL(process.env.DATABASE_URL ?? "").pathname.slice(1));
if (!databaseName.endsWith("_test")) {
  throw new Error(`Refusing to TRUNCATE: database "${databaseName}" does not end with "_test"`);
}

beforeEach(async () => {
  await db.execute(sql`TRUNCATE records RESTART IDENTITY`);
});

afterAll(async () => {
  await pool.end();
});
