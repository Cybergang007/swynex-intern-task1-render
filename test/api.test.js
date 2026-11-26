const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const os = require("os");
const path = require("path");
const fs = require("fs");

// Configure env BEFORE loading the app so it uses an isolated temp database.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "task-api-"));
process.env.DB_PATH = path.join(tmpDir, "test.db");
process.env.API_KEY = "test-key";

const app = require("../src/app");
const db = require("../src/db/database");
const { seedIfEmpty } = require("../src/db/seed");

let server, base;
const auth = { "Content-Type": "application/json", "x-api-key": "test-key" };
const json = async (res) => ({ status: res.status, body: await res.json() });

before(async () => {
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("GET /health returns 200", async () => {
  const { status, body } = await json(await fetch(`${base}/health`));
  assert.equal(status, 200);
  assert.equal(body.success, true);
});

test("GET /docs and /openapi.json are served", async () => {
  assert.equal((await fetch(`${base}/docs/`)).status, 200);
  const { body } = await json(await fetch(`${base}/openapi.json`));
  assert.equal(body.openapi, "3.0.3");
});

test("seedIfEmpty inserts sample data once", () => {
  assert.equal(seedIfEmpty(db), 5);
  assert.equal(seedIfEmpty(db), 0);
});

test("GET /api/tasks lists seeded tasks publicly", async () => {
  const { status, body } = await json(await fetch(`${base}/api/tasks`));
  assert.equal(status, 200);
  assert.equal(body.data.length, 5);
  assert.equal(typeof body.data[0].completed, "boolean");
});

test("POST without or with wrong key returns 401", async () => {
  const noKey = await fetch(`${base}/api/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "x" }) });
  assert.equal(noKey.status, 401);
  const wrong = await fetch(`${base}/api/tasks`, { method: "POST", headers: { ...auth, "x-api-key": "nope" }, body: JSON.stringify({ title: "x" }) });
  assert.equal(wrong.status, 401);
});

test("full CRUD lifecycle", async () => {
  const created = await json(await fetch(`${base}/api/tasks`, { method: "POST", headers: auth, body: JSON.stringify({ title: "  Ship it  ", description: "Deploy" }) }));
  assert.equal(created.status, 201);
  assert.equal(created.body.data.title, "Ship it");
  assert.equal(created.body.data.completed, false);
  const id = created.body.data.id;

  const got = await json(await fetch(`${base}/api/tasks/${id}`));
  assert.equal(got.status, 200);

  const updated = await json(await fetch(`${base}/api/tasks/${id}`, { method: "PUT", headers: auth, body: JSON.stringify({ completed: true }) }));
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.completed, true);
  assert.equal(updated.body.data.title, "Ship it");

  const del = await json(await fetch(`${base}/api/tasks/${id}`, { method: "DELETE", headers: auth }));
  assert.equal(del.status, 200);
  assert.equal((await fetch(`${base}/api/tasks/${id}`)).status, 404);
});

test("validation errors return 400 with details", async () => {
  const cases = [
    {},
    { title: "" },
    { title: "a".repeat(121) },
    { title: "ok", completed: "yes" },
    { title: "ok", extra: 1 }
  ];
  for (const payload of cases) {
    const { status, body } = await json(await fetch(`${base}/api/tasks`, { method: "POST", headers: auth, body: JSON.stringify(payload) }));
    assert.equal(status, 400, JSON.stringify(payload));
    assert.equal(body.error.code, "VALIDATION_ERROR");
  }
  const empty = await fetch(`${base}/api/tasks/1`, { method: "PUT", headers: auth, body: "{}" });
  assert.equal(empty.status, 400);
});

test("malformed JSON, bad id and unknown route", async () => {
  const bad = await json(await fetch(`${base}/api/tasks`, { method: "POST", headers: auth, body: "{oops" }));
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, "INVALID_JSON");
  assert.equal((await fetch(`${base}/api/tasks/abc`)).status, 400);
  assert.equal((await fetch(`${base}/nope`)).status, 404);
});
