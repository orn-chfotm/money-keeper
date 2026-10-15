import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { AppError, notFound } from "./errors.js";
import { healthRouter } from "./routes/health.js";
import { recordsRouter } from "./routes/records.js";

// Never expose stack traces, internal messages or SQL in responses.
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  // 4xx errors raised by express.json (malformed JSON, body too large, ...).
  if (typeof error?.status === "number" && error.status >= 400 && error.status < 500) {
    res.status(error.status).json({
      error: {
        code: "BAD_REQUEST",
        message: error.type === "entity.parse.failed" ? "Malformed JSON body" : "Bad Request",
      },
    });
    return;
  }

  console.error(error);
  res.status(500).json({ error: { code: "INTERNAL", message: "Internal Server Error" } });
};

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.use(healthRouter);
  app.use(recordsRouter);

  app.use((_req, _res, next) => {
    next(notFound());
  });

  app.use(errorHandler);

  return app;
}
