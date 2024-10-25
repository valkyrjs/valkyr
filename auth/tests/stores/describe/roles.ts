import { assertArrayIncludes, assertEquals, assertObjectMatch } from "@std/assert";
import { beforeEach, it } from "@std/testing/bdd";

import { Role } from "~libraries/role.ts";
import type { PostgresAuth } from "~stores/postgres/auth.ts";

import { describe } from "../describe.ts";
import { AppPermissions } from "../permissions.ts";

const TENANT_ID = "tenant-a";
const ENTITY_ID = "entity-a";

export default describe("Roles", (getAuth) => {
  let auth: PostgresAuth<AppPermissions>;
  let role: Role<AppPermissions>;

  beforeEach(async () => {
    auth = await getAuth();
    role = await auth.addRole({
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
            filter: ["name", "email"],
          },
          update: true,
          delete: true,
        },
      },
    });
    await role.addEntity(ENTITY_ID);
  });

  it("should successfully create a role", async () => {
    assertObjectMatch((await auth.getRole(role.id))!, {
      name: "admin",
      permissions: {
        users: {
          create: {
            conditions: {
              tenantId: TENANT_ID,
            },
          },
          read: {
            filter: ["name", "email"],
          },
          update: true,
          delete: true,
        },
      },
    });
  });

  it("should successfully add a entity", async () => {
    assertArrayIncludes(
      await auth.getRolesByEntityId(ENTITY_ID).then((roles) => roles.map((role) => role.toJSON())),
      [
        {
          id: role.id,
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
                filter: ["name", "email"],
              },
              update: true,
              delete: true,
            },
          },
        },
      ],
    );
  });

  it("should successfully add, and remove a entity", async () => {
    await role.delEntity(ENTITY_ID);
    assertEquals(
      await auth.getRolesByEntityId(ENTITY_ID).then((roles) => roles.map((role) => role.toJSON())),
      [],
    );
  });

  it("should successfully set custom conditions and filters for a entity", async () => {
    await auth.setConditions(role.id, ENTITY_ID, {
      users: {
        create: {
          tenantId: "tenant-b",
        },
      },
    });

    await auth.setFilters(role.id, ENTITY_ID, {
      users: {
        read: ["email"],
      },
    });

    assertArrayIncludes(
      await auth.getRolesByEntityId(ENTITY_ID).then((roles) => roles.map((role) => role.toJSON())),
      [
        {
          id: role.id,
          tenantId: TENANT_ID,
          name: "admin",
          permissions: {
            users: {
              create: {
                conditions: {
                  tenantId: "tenant-b",
                },
              },
              read: {
                filter: ["email"],
              },
              update: true,
              delete: true,
            },
          },
        },
      ],
    );
  });
});
