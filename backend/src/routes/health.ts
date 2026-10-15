import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

healthRouter.get("/health/ready", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: "ok", db: "ok" });
  } catch (error) {
    console.error("Readiness check failed:", error);
    res.status(503).json({ status: "error", db: "unavailable" });
  }
});
