import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

// Idle clients emit "error" when the DB connection drops; without a listener the process crashes.
pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

export const db = drizzle(pool, { schema });
