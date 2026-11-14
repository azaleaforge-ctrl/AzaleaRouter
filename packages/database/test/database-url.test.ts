import assert from "node:assert/strict";
import test from "node:test";
import { validateDatabaseUrl } from "../src/database-url.js";

test("accepts PostgreSQL connection URLs", () => {
  const value = "postgresql://azalea:local-test-password@127.0.0.1:5432/azalea_test";
  assert.equal(validateDatabaseUrl(value), value);
});

test("accepts postgres protocol URLs", () => {
  const value = "postgres://azalea:local-test-password@localhost:5432/azalea_test";
  assert.equal(validateDatabaseUrl(value), value);
});

test("rejects malformed or non-PostgreSQL URLs", () => {
  assert.throws(() => validateDatabaseUrl("not-a-url"), /valid PostgreSQL/);
  assert.throws(() => validateDatabaseUrl("mysql://user:pass@localhost/db"), /postgres/);
  assert.throws(() => validateDatabaseUrl("postgresql://localhost:5432/db"), /credentials/);
  assert.throws(() => validateDatabaseUrl("postgresql://user:pass@localhost:5432/"), /database name/);
});
