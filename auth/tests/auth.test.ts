import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assertEquals, assertNotEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { z } from "zod";

import { Auth } from "../libraries/auth.ts";
import { Guard } from "../mod.ts";

const accountTenants = {
  "account-a": ["tenant-a", "tenant-b"],
  "account-b": ["tenant-a", "tenant-c"],
} as any;

const req = {
  session: {
    accountId: "account-a",
  },
};

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
  permissions: {
    user: ["create", "read", "update", "delete"],
  } as const,
  guards: {
    "tenant:related": new Guard({
      input: z.object({ tenantId: z.string() }),
      check: async ({ tenantId }) => {
        return accountTenants[req.session.accountId]?.includes(tenantId);
      },
    }),
    "account:own": new Guard({
      input: z.object({ accountId: z.string() }),
      check: async ({ accountId }) => {
        return accountId === req.session.accountId;
      },
    }),
  },
});

const adminRole = auth.role("admin", "Admin", {
  user: ["create", "read", "update", "delete"],
});

const moderatorRole = auth.role("moderator", "Moderator", {
  user: ["read", "update", "delete"],
});

const userRole = auth.role("user", "User", {
  user: ["read", "update"],
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
    const access = auth.access([adminRole]);

    assertEquals(access.has("user", "create"), true);
    assertEquals(access.has("user", "read"), true);
    assertEquals(access.has("user", "update"), true);
    assertEquals(access.has("user", "delete"), true);
  });

  it("should generate a multi role access instance", async () => {
    const access = auth.access([moderatorRole, userRole]);

    assertEquals(access.has("user", "create"), false);
    assertEquals(access.has("user", "read"), true);
    assertEquals(access.has("user", "update"), true);
    assertEquals(access.has("user", "delete"), true);
  });

  it("should pass guard checks", async () => {
    assertEquals(await auth.check("account:own", { accountId: "account-a" }), true);
    assertEquals(await auth.check("tenant:related", { tenantId: "tenant-a" }), true);
  });

  it("should fail guard checks", async () => {
    assertEquals(await auth.check("account:own", { accountId: "account-b" }), false);
    assertEquals(await auth.check("tenant:related", { tenantId: "tenant-c" }), false);
  });
});
