import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assertEquals, assertNotEquals } from "@std/assert";
import { beforeAll, describe, it } from "@std/testing/bdd";

import { Auth } from "~libraries/auth.ts";

import { type AppPermissions, permissions } from "./permissions.ts";

const TENANT_ID = "tenant-a";

describe("Auth", () => {
  let auth: Auth<AppPermissions, Session>;

  beforeAll(() => {
    auth = new Auth<AppPermissions, Session>({
      permissions,
      auth: {
        algorithm: "RS256",
        privateKey: readFileSync(join(import.meta.dirname!, "keys", "private"), "utf-8"),
        publicKey: readFileSync(join(import.meta.dirname!, "keys", "public"), "utf-8"),
        issuer: "https://valkyrjs.com",
        audience: "https://valkyrjs.com",
      },
    });
  });

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

type Session = {
  accountId: string;
};
