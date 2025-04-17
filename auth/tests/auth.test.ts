import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assertEquals, assertNotEquals, assertObjectMatch } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

import { Auth } from "../libraries/auth.ts";
import { guards } from "./mocks/guard.ts";
import { permissions } from "./mocks/permissions.ts";
import { mockRolesProvider } from "./mocks/providers/roles.ts";
import { session } from "./mocks/session.ts";

const auth = new Auth({
  settings: {
    algorithm: "RS256",
    privateKey: readFileSync(join(import.meta.dirname!, "keys", "private"), "utf-8"),
    publicKey: readFileSync(join(import.meta.dirname!, "keys", "public"), "utf-8"),
    issuer: "https://valkyrjs.com",
    audience: "https://valkyrjs.com",
  },
  session,
  permissions,
  guards,
}, {
  roles: mockRolesProvider,
});

describe("Auth", () => {
  it("should sign a session", async () => {
    const token = await auth.generate({ type: "user", accountId: "abc" });

    assertNotEquals(token, undefined);
  });

  it("should resolve a session", async () => {
    const token = await auth.generate({ type: "user", accountId: "abc" });

    assertNotEquals(token, undefined);

    const session = await auth.resolve(token);
    if (session.valid === false) {
      throw new Error(`Session failed to resolve with code ${session.code}`);
    }

    assertEquals(session.accountId, "abc");
    assertEquals(session.$meta.payload.iss, "https://valkyrjs.com");
    assertEquals(session.$meta.payload.aud, "https://valkyrjs.com");
    assertEquals(session.$meta.headers.alg, "RS256");
  });

  it("should invalidate after expiry", async () => {
    const token = await auth.generate({ type: "user", accountId: "abc" }, "1 second");

    assertNotEquals(token, undefined);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const session = await auth.resolve(token);
    if (session.valid === true) {
      throw new Error("Expected invalid session!");
    }

    assertEquals(session.code, "ERR_JWT_EXPIRED");
    assertEquals(session.message, `"exp" claim timestamp check failed`);
  });

  it("should return a raw session json object", async () => {
    const token = await auth.generate({ type: "user", accountId: "account-a" });

    assertNotEquals(token, undefined);

    const session = await auth.resolve(token);
    if (session.valid === false) {
      throw new Error("Expected valid session!");
    }

    assertObjectMatch(session.toJSON(), { type: "user", accountId: "account-a" });
  });

  it("should generate a single role access instance", async () => {
    const token = await auth.generate({ type: "user", accountId: "account-a" });

    assertNotEquals(token, undefined);

    const session = await auth.resolve(token);
    if (session.valid === false) {
      throw new Error("Expected valid session!");
    }

    assertEquals(session.has("account", "create"), true);
    assertEquals(session.has("account", "read"), true);
    assertEquals(session.has("account", "update"), true);
    assertEquals(session.has("account", "delete"), true);
  });

  it("should generate a multi role access instance", async () => {
    const token = await auth.generate({ type: "user", accountId: "account-b" });

    assertNotEquals(token, undefined);

    const session = await auth.resolve(token);
    if (session.valid === false) {
      throw new Error("Expected valid session!");
    }

    assertEquals(session.has("account", "create"), false);
    assertEquals(session.has("account", "read"), true);
    assertEquals(session.has("account", "update"), true);
    assertEquals(session.has("account", "delete"), true);
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
