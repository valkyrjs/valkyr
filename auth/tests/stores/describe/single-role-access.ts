import { assertEquals } from "@std/assert";
import { beforeEach, it } from "@std/testing/bdd";

import type { PostgresAuth } from "~stores/postgres/auth.ts";

import { describe } from "../describe.ts";
import type { AppPermissions } from "../permissions.ts";

const TENANT_ID = "tenant-a";
const ENTITY_ID = "entity-a";

export default describe("Single Role Access", (getAuth) => {
  let auth: PostgresAuth<AppPermissions>;
  let token: string;

  beforeEach(async () => {
    auth = await getAuth();
    token = await auth.generate(TENANT_ID, ENTITY_ID);
    await auth.addRole({
      tenantId: TENANT_ID,
      name: "admin",
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
    }).then((role) => role.addEntity(ENTITY_ID));
  });

  it("should successfully authorize assigned permissions", async () => {
    const { access } = await auth.resolve(token);
    assertEquals(access.check("users", "create", { tenantId: TENANT_ID }).granted, true);
    assertEquals(access.check("users", "read").granted, true);
    assertEquals(access.check("users", "update").granted, true);
    assertEquals(access.check("users", "delete").granted, true);
  });

  it("should succesfully filter based on a single assigned role override", async () => {
    const { access } = await auth.resolve(token);
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
});
