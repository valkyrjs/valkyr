import { readFileSync } from "node:fs";
import { join } from "node:path";

import { a } from "@arrirpc/schema";
import { assertEquals, assertNotEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

import { Auth } from "../libraries/auth.ts";
import { AccessGuard } from "../libraries/guard.ts";

const TENANT_ID = "tenant-a";

const auth = new Auth({
  settings: {
    algorithm: "RS256",
    privateKey: readFileSync(join(import.meta.dirname!, "keys", "private"), "utf-8"),
    publicKey: readFileSync(join(import.meta.dirname!, "keys", "public"), "utf-8"),
    issuer: "https://valkyrjs.com",
    audience: "https://valkyrjs.com",
  },
  session: a.object({
    accountId: a.string(),
  }),
  permissions: {
    users: {
      create: new AccessGuard({
        input: a.object({ tenantId: a.string() }),
        flag: a.enumerator(["pass", "fail"]),
        check: async ({ tenantId }, flag) => {
          if (flag === "fail") {
            throw new Error(`Session does not have permission to add user for tenant '${tenantId}'.`);
          }
        },
      }),
      read: true,
      update: true,
      delete: true,
    },
  },
});

describe("Auth", () => {
  it("should sign a session", async () => {
    const token = await auth.generate({ accountId: "abc" });

    assertNotEquals(token, undefined);
  });

  it("should resolve a session", async () => {
    const token = await auth.generate({ accountId: "abc" });

    assertNotEquals(token, undefined);

    const session = await auth.resolve(token);

    assertEquals(session.accountId, "abc");
  });

  it("should generate a single role access instance", async () => {
    const access = auth.access([{
      id: "admin",
      name: "admin",
      permissions: {
        users: {
          create: "pass",
          read: true,
          update: true,
          delete: true,
        },
      },
    }]);

    assertEquals((await access.has("users", "create", { tenantId: TENANT_ID })).granted, true);
    assertEquals((await access.has("users", "read")).granted, true);
    assertEquals((await access.has("users", "update")).granted, true);
    assertEquals((await access.has("users", "delete")).granted, true);
  });

  it("should generate a multi role access instance", async () => {
    const access = auth.access([
      {
        id: "moderator",
        name: "moderator",
        permissions: {
          users: {
            create: "fail",
            read: true,
            update: true,
            delete: true,
          },
        },
      },
      {
        id: "user",
        name: "user",
        permissions: {
          users: {
            read: true,
            update: true,
          },
        },
      },
    ]);

    assertEquals((await access.has("users", "create", { tenantId: TENANT_ID })).granted, false);
    assertEquals((await access.has("users", "read")).granted, true);
    assertEquals((await access.has("users", "update")).granted, true);
    assertEquals((await access.has("users", "delete")).granted, true);
  });
});
