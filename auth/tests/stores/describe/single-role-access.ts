import { assertEquals } from "@std/assert";
import { beforeEach, it } from "@std/testing/bdd";

import { describe } from "../describe.ts";

const TENANT_ID = "tenant-a";
const ENTITY_ID = "entity-a";

export default describe("Single Role Access", (container) => {
  let token: string;

  beforeEach(async () => {
    token = await container.auth.generate(TENANT_ID, ENTITY_ID);
    await container.auth.addRole({
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
    const { access } = await container.auth.resolve(token);
    assertEquals(access.check("users", "create", { tenantId: TENANT_ID }).granted, true);
    assertEquals(access.check("users", "read").granted, true);
    assertEquals(access.check("users", "update").granted, true);
    assertEquals(access.check("users", "delete").granted, true);
  });

  it("should succesfully filter based on a single assigned role override", async () => {
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
