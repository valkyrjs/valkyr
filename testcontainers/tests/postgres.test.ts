import { assertArrayIncludes } from "@std/assert";
import { afterAll, describe, it } from "@std/testing/bdd";

import { PostgresTestContainer } from "../containers/postgres.ts";

const DB_NAME = "sandbox";

const container = await PostgresTestContainer.start("postgres:14");
await container.create(DB_NAME);

const sql = await container.client(DB_NAME);

describe("Postgres", () => {
  afterAll(async () => {
    await container.stop();
  });

  it("should spin up a postgres container", async () => {
    const res = await sql`SELECT 1`;
    assertArrayIncludes(res, [{ "?column?": 1 }]);
  });
});
