import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe } from "@std/testing/bdd";
import { Database } from "sqlite";

import { migrate, SQLiteAuth } from "../../stores/sqlite/auth.ts";
import { AppPermissions, permissions } from "./permissions.ts";

const DB_MIGRATE = resolve(import.meta.dirname!, "sqlite-migrate");

import { AuthContainer } from "./describe.ts";
import testMultiRoleAccess from "./describe/multi-role-access.ts";
import testRoles from "./describe/roles.ts";
import testSingleRoleAccess from "./describe/single-role-access.ts";

const container: AuthContainer = {} as AuthContainer;

/*
 |--------------------------------------------------------------------------------
 | Database
 |--------------------------------------------------------------------------------
 */

beforeEach(async () => {
  container.auth = await getAuth();
});

afterEach(async () => {
  await Deno.remove(DB_MIGRATE, { recursive: true });
});

/*
 |--------------------------------------------------------------------------------
 | Tests
 |--------------------------------------------------------------------------------
 */

describe("Stores > SQLite", async () => {
  testMultiRoleAccess(container);
  testSingleRoleAccess(container);
  testRoles(container);
});

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function getAuth() {
  const database = new Database(":memory:");
  const auth = new SQLiteAuth<AppPermissions>({
    database: () => database,
    permissions,
    auth: {
      algorithm: "RS256",
      privateKey: readFileSync(join(import.meta.dirname!, "keys", "private"), "utf-8"),
      publicKey: readFileSync(join(import.meta.dirname!, "keys", "public"), "utf-8"),
      issuer: "https://valkyrjs.com",
      audience: "https://valkyrjs.com",
    },
  });
  await migrate(database, DB_MIGRATE);
  return auth;
}
