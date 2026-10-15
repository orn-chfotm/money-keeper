import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { db } from "../src/db/client.js";

const app = createApp();

type RecordBody = {
  date: string;
  kind: string;
  incomeType?: string | null;
  amount: unknown;
  memo?: string;
};

const expense: RecordBody = {
  date: "2026-03-15",
  kind: "expense",
  incomeType: null,
  amount: 12000,
  memo: "lunch",
};

function post(body: unknown) {
  return request(app).post("/records").send(body as object);
}

async function create(body: RecordBody) {
  const res = await post(body);
  expect(res.status).toBe(201);
  return res.body as { id: number } & RecordBody;
}

function list(from: string, to: string) {
  return request(app).get("/records").query({ from, to });
}

function expectValidationError(res: request.Response, path: string) {
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe("VALIDATION_ERROR");
  expect(res.body.error.details.map((detail: { path: string }) => detail.path)).toContain(path);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /records", () => {
  it("creates all four record types and returns them via GET", async () => {
    const bodies: RecordBody[] = [
      { date: "2026-03-01", kind: "income", incomeType: "salary", amount: 3_000_000, memo: "pay" },
      { date: "2026-03-02", kind: "income", incomeType: "other", amount: 50_000, memo: "" },
      { date: "2026-03-03", kind: "expense", incomeType: null, amount: 8_000, memo: "coffee" },
      { date: "2026-03-04", kind: "saving", incomeType: null, amount: 500_000, memo: "fund" },
    ];

    const created = [];
    for (const body of bodies) {
      const res = await post(body);
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: expect.any(Number), ...body });
      created.push(res.body);
    }

    const res = await list("2026-03-01", "2026-03-31");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [...created].reverse() });
  });

  it("returns exactly the camelCase DTO keys", async () => {
    const record = await create(expense);
    expect(Object.keys(record).sort()).toEqual(
      ["amount", "date", "id", "incomeType", "kind", "memo"].sort(),
    );
  });

  it("defaults memo to an empty string and incomeType to null", async () => {
    const res = await post({ date: "2026-03-15", kind: "saving", amount: 1000 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ incomeType: null, memo: "" });
  });

  it.each([0, -1, 1.5, 1_000_000_000, "1000", null])("rejects amount %j", async (amount) => {
    const res = await post({ ...expense, amount });
    expectValidationError(res, "amount");
  });

  it("accepts the maximum amount 999,999,999", async () => {
    const res = await post({ ...expense, amount: 999_999_999 });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(999_999_999);
  });

  it.each(["2026-02-30", "2027-02-29", "2026-3-01", "2026/03/01", "", 20260301])(
    "rejects date %j",
    async (date) => {
      const res = await post({ ...expense, date });
      expectValidationError(res, "date");
    },
  );

  it("accepts the leap day 2028-02-29", async () => {
    const res = await post({ ...expense, date: "2028-02-29" });
    expect(res.status).toBe(201);
    expect(res.body.date).toBe("2028-02-29");
  });

  it.each([
    { kind: "income", incomeType: null },
    { kind: "income", incomeType: undefined },
    { kind: "expense", incomeType: "salary" },
    { kind: "saving", incomeType: "other" },
    { kind: "income", incomeType: "bonus" },
  ])("rejects kind/incomeType combination %j", async (combo) => {
    const res = await post({ ...expense, ...combo });
    expectValidationError(res, "incomeType");
  });

  it("rejects an unknown kind", async () => {
    const res = await post({ ...expense, kind: "transfer" });
    expectValidationError(res, "kind");
  });

  it("rejects a 201-character memo and accepts 200 characters", async () => {
    const rejected = await post({ ...expense, memo: "a".repeat(201) });
    expectValidationError(rejected, "memo");

    const accepted = await post({ ...expense, memo: "가".repeat(200) });
    expect(accepted.status).toBe(201);
    expect(accepted.body.memo).toBe("가".repeat(200));
  });

  it("returns BAD_REQUEST for malformed JSON", async () => {
    const res = await request(app)
      .post("/records")
      .set("Content-Type", "application/json")
      .send("{invalid");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: "BAD_REQUEST", message: "Malformed JSON body" } });
  });

  it("returns VALIDATION_ERROR when the body is missing", async () => {
    const res = await request(app).post("/records");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /records", () => {
  it("round-trips date strings without timezone shifts", async () => {
    for (const date of ["2026-01-01", "2026-12-31", "2028-02-29"]) {
      const created = await create({ ...expense, date });
      expect(created.date).toBe(date);
    }
    const res = await list("2026-01-01", "2026-12-31");
    expect(res.body.items.map((item: RecordBody) => item.date)).toEqual([
      "2026-12-31",
      "2026-01-01",
    ]);
  });

  it("includes both from and to and excludes dates outside", async () => {
    for (const date of ["2026-02-28", "2026-03-01", "2026-03-31", "2026-04-01"]) {
      await create({ ...expense, date });
    }
    const res = await list("2026-03-01", "2026-03-31");
    expect(res.status).toBe(200);
    expect(res.body.items.map((item: RecordBody) => item.date)).toEqual([
      "2026-03-31",
      "2026-03-01",
    ]);
  });

  it("sorts by date DESC, then id DESC", async () => {
    const a = await create({ ...expense, date: "2026-03-10" });
    const b = await create({ ...expense, date: "2026-03-20" });
    const c = await create({ ...expense, date: "2026-03-10" });
    const d = await create({ ...expense, date: "2026-03-05" });

    const res = await list("2026-03-01", "2026-03-31");
    expect(res.body.items.map((item: { id: number }) => item.id)).toEqual([b.id, c.id, a.id, d.id]);
  });

  it("returns an empty list when nothing matches", async () => {
    const res = await list("2026-03-01", "2026-03-31");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [] });
  });

  it.each([
    [{ to: "2026-03-31" }, "from"],
    [{ from: "2026-03-01" }, "to"],
    [{ from: "2026-02-30", to: "2026-03-31" }, "from"],
    [{ from: "2026-03-01", to: "2026-03-32" }, "to"],
  ])("rejects query %j", async (query, path) => {
    const res = await request(app).get("/records").query(query);
    expectValidationError(res, path);
  });

  it("rejects repeated from parameters", async () => {
    const res = await request(app).get("/records?from=2026-03-01&from=2026-03-02&to=2026-03-31");
    expectValidationError(res, "from");
  });

  it("rejects from after to", async () => {
    const res = await list("2026-03-02", "2026-03-01");
    expectValidationError(res, "to");
  });

  it("accepts a 366-day range and rejects 367 days", async () => {
    const ok = await list("2028-01-01", "2028-12-31");
    expect(ok.status).toBe(200);

    const tooLong = await list("2026-01-01", "2027-01-02");
    expectValidationError(tooLong, "to");
  });
});

describe("PUT /records/:id", () => {
  it("updates a record and the change is visible in GET", async () => {
    const record = await create(expense);
    const update = {
      date: "2026-03-20",
      kind: "income",
      incomeType: "other",
      amount: 7000,
      memo: "refund",
    };

    const res = await request(app).put(`/records/${record.id}`).send(update);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: record.id, ...update });

    const listed = await list("2026-03-01", "2026-03-31");
    expect(listed.body.items).toEqual([{ id: record.id, ...update }]);
  });

  it("moves a record to another month", async () => {
    const record = await create(expense);
    await request(app)
      .put(`/records/${record.id}`)
      .send({ ...expense, date: "2026-04-02" })
      .expect(200);

    const march = await list("2026-03-01", "2026-03-31");
    expect(march.body.items).toEqual([]);
    const april = await list("2026-04-01", "2026-04-30");
    expect(april.body.items.map((item: { id: number }) => item.id)).toEqual([record.id]);
  });

  it("validates the body with the same rules as POST", async () => {
    const record = await create(expense);
    const res = await request(app)
      .put(`/records/${record.id}`)
      .send({ ...expense, amount: 0 });
    expectValidationError(res, "amount");
  });

  it("returns 404 for a non-existent id", async () => {
    const res = await request(app).put("/records/999").send(expense);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("DELETE /records/:id", () => {
  it("deletes a record and the change is visible in GET", async () => {
    const keep = await create(expense);
    const remove = await create(expense);

    const res = await request(app).delete(`/records/${remove.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe("");

    const listed = await list("2026-03-01", "2026-03-31");
    expect(listed.body.items.map((item: { id: number }) => item.id)).toEqual([keep.id]);
  });

  it("returns 404 for a non-existent or already deleted id", async () => {
    const record = await create(expense);
    await request(app).delete(`/records/${record.id}`).expect(204);

    const res = await request(app).delete(`/records/${record.id}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("invalid ids", () => {
  it.each(["abc", "0", "-1", "1.5", "01", "1e3", "9007199254740992", "99999999999999999999"])(
    "returns 404 for id %s",
    async (id) => {
      const put = await request(app).put(`/records/${id}`).send(expense);
      expect(put.status).toBe(404);
      expect(put.body.error.code).toBe("NOT_FOUND");

      const del = await request(app).delete(`/records/${id}`);
      expect(del.status).toBe(404);
      expect(del.body.error.code).toBe("NOT_FOUND");
    },
  );
});

describe("CORS", () => {
  it("allows a PUT preflight from the allowed origin", async () => {
    const res = await request(app)
      .options("/records/1")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "PUT")
      .set("Access-Control-Request-Headers", "Content-Type");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-allow-methods"]).toContain("PUT");
    expect(res.headers["access-control-allow-headers"]?.toLowerCase()).toContain("content-type");
  });
});

describe("internal errors", () => {
  it("returns INTERNAL without leaking the internal message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(db, "select").mockImplementation(() => {
      throw new Error('relation "secret_table" does not exist: SELECT * FROM secret_table');
    });

    const res = await list("2026-03-01", "2026-03-31");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: "INTERNAL", message: "Internal Server Error" } });
    expect(res.text).not.toContain("secret_table");
  });
});
