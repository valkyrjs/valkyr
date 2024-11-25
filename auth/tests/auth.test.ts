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

  it("should generate a single role access instance", () => {
    const access = auth.access([{
      id: "role-1",
      name: "Role #1",
      permissions: {
        users: {
          create: {
            conditions: {
              tenantId: TENANT_ID,
            },
          },
          read: {
            filter: ["name"],
          },
          update: true,
          delete: true,
        },
      },
    }]);

    assertEquals(access.check("users", "create", { tenantId: TENANT_ID }).granted, true);
    assertEquals(access.check("users", "read").granted, true);
    assertEquals(access.check("users", "update").granted, true);
    assertEquals(access.check("users", "delete").granted, true);
    assertEquals(
      access.check("users", "read").filter({
        name: "John Doe",
        email: "john.doe@fixture.none",
      }),
      {
        name: "John Doe",
      } as any,
    );
  });

  it("should generate a multi role access instance", () => {
    const access = auth.access([
      {
        id: "moderator",
        name: "moderator",
        permissions: {
          users: {
            read: {
              filter: ["name", "email"],
            },
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
            read: {
              filter: ["name"],
            },
            update: true,
          },
        },
      },
    ]);

    assertEquals(access.check("users", "create", { tenantId: TENANT_ID }).granted, false);
    assertEquals(access.check("users", "read").granted, true);
    assertEquals(access.check("users", "update").granted, true);
    assertEquals(access.check("users", "delete").granted, true);
    assertEquals(
      access.check("users", "read").filter({
        name: "John Doe",
        email: "john.doe@fixture.none",
      }),
      {
        name: "John Doe",
        email: "john.doe@fixture.none",
      } as any,
    );
  });
});

type Session = {
  accountId: string;
};
