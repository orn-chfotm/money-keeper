import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("GET /health", () => {
  it("returns 200", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("GET /health/ready", () => {
  it("returns 200 when the database is reachable", async () => {
    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "ok" });
  });
});

describe("CORS", () => {
  it("sets Access-Control-Allow-Origin for an allowed origin", async () => {
    const res = await request(app).get("/health").set("Origin", "http://localhost:3000");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  it("omits Access-Control-Allow-Origin for a disallowed origin", async () => {
    const res = await request(app).get("/health").set("Origin", "http://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("error handler", () => {
  it("returns 400 BAD_REQUEST without details for malformed JSON", async () => {
    const res = await request(app)
      .post("/health")
      .set("Content-Type", "application/json")
      .send("{invalid");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: "BAD_REQUEST", message: "Malformed JSON body" },
    });
  });
});

describe("unknown route", () => {
  it("returns a JSON 404", async () => {
    const res = await request(app).get("/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Not Found" } });
  });
});
