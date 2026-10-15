import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

// Runs once before any test file. Tests TRUNCATE tables, so refuse anything but a *_test database.
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set");
  }
  const databaseName = decodeURIComponent(new URL(url).pathname.slice(1));
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests: database "${databaseName}" does not end with "_test"`,
    );
  }

  const pool = new pg.Pool({ connectionString: url });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}
