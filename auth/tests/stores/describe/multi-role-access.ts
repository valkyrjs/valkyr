import { assertEquals } from "@std/assert";
import { beforeEach, it } from "@std/testing/bdd";

import { Role } from "~libraries/role.ts";

import { describe } from "../describe.ts";
import { AppPermissions } from "../permissions.ts";

const TENANT_ID = "tenant-a";
const ENTITY_ID = "entity-a";

export default describe("Multi Role Access", (container) => {
  let token: string;
  let moderator: Role<AppPermissions>;
  let user: Role<AppPermissions>;

  beforeEach(async () => {
    token = await container.auth.generate(TENANT_ID, ENTITY_ID);

    moderator = await container.auth.addRole({
      tenantId: TENANT_ID,
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
    });

    await moderator.addEntity(ENTITY_ID);

    user = await container.auth.addRole({
      tenantId: TENANT_ID,
      name: "user",
      permissions: {
        users: {
          read: {
            filter: ["name"],
          },
          update: true,
        },
      },
    });

    await user.addEntity(ENTITY_ID);
  });

  it("should have combined access rights", async () => {
    const { access } = await container.auth.resolve(token);
    assertEquals(access.check("users", "create", { tenantId: TENANT_ID }).granted, false);
    assertEquals(access.check("users", "read").granted, true);
    assertEquals(access.check("users", "update").granted, true);
    assertEquals(access.check("users", "delete").granted, true);
  });

  it("should have combined read filters", async () => {
    const { access } = await container.auth.resolve(token);
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

  it("should prioritize entity assignments", async () => {
    await container.auth.setFilters(moderator.roleId, ENTITY_ID, {
      users: {
        read: ["name"],
      },
    });

    const { access } = await container.auth.resolve(token);

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
