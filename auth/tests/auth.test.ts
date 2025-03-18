import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assertEquals, assertNotEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { z } from "npm:zod@3.24.1";

import { Auth } from "~libraries/auth.ts";

import { permissions } from "./permissions.ts";

const TENANT_ID = "tenant-a";

const auth = new Auth({
  settings: {
    algorithm: "RS256",
    privateKey: readFileSync(join(import.meta.dirname!, "keys", "private"), "utf-8"),
    publicKey: readFileSync(join(import.meta.dirname!, "keys", "public"), "utf-8"),
    issuer: "https://valkyrjs.com",
    audience: "https://valkyrjs.com",
  },
  session: z.object({
    accountId: z.string(),
  }),
  permissions,
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
