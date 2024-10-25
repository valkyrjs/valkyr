import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe } from "@std/testing/bdd";
import type { PostgresConnection } from "@valkyr/drizzle";
import { PostgresTestContainer } from "@valkyr/testcontainers/postgres";

import { PostgresAuth } from "../../stores/postgres/auth.ts";
import { migrate } from "../../stores/postgres/database.ts";
import testMultiRoleAccess from "./describe/multi-role-access.ts";
import testRoles from "./describe/roles.ts";
import testSingleRoleAccess from "./describe/single-role-access.ts";
import { AppPermissions, permissions } from "./permissions.ts";

const DB_NAME = "sandbox";

const container = await PostgresTestContainer.start("postgres:14");

const authContainerFn = async () => getAuth(container.url(DB_NAME));

/*
 |--------------------------------------------------------------------------------
 | Database
 |--------------------------------------------------------------------------------
 */

beforeAll(async () => {
  await container.create(DB_NAME);
  await migrate(container.client(DB_NAME));
});

afterEach(async () => {
  await container.client(DB_NAME)`TRUNCATE "auth"."roles","auth"."entities" CASCADE`;
});

afterAll(async () => {
  await container.stop();
});

/*
 |--------------------------------------------------------------------------------
 | Tests
 |--------------------------------------------------------------------------------
 */

describe("PostgresAuth", () => {
  testMultiRoleAccess(authContainerFn);
  testSingleRoleAccess(authContainerFn);
  testRoles(authContainerFn);
});

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function getAuth(database: PostgresConnection) {
  return new PostgresAuth<AppPermissions>({
    database,
    permissions,
    auth: {
      algorithm: "RS256",
      privateKey: readFileSync(join(import.meta.dirname!, "keys", "private"), "utf-8"),
      publicKey: readFileSync(join(import.meta.dirname!, "keys", "public"), "utf-8"),
      issuer: "https://valkyrjs.com",
      audience: "https://valkyrjs.com",
    },
  });
}
