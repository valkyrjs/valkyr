import { type Database, takeOne } from "@valkyr/drizzle";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import type { Permissions, RoleData, RolePayload } from "~libraries/types.ts";

import type { AuthDB } from "../database.ts";
import type { EntityProvider } from "../entities/provider.ts";
import { schema as entitySchema } from "../entities/schema.ts";
import { type Role, schema } from "./schema.ts";

export class RoleProvider<TPermissions extends Permissions> {
  constructor(readonly db: Database<AuthDB>, readonly entities: EntityProvider<TPermissions>) {}

  async addRole(payload: RolePayload<TPermissions>): Promise<string> {
    const roleId = nanoid();
    await this.db.insert(schema).values({
      roleId,
      ...payload,
      permissions: JSON.stringify(payload.permissions),
    });
    return roleId;
  }

  async getRoleById(roleId: string): Promise<Role | undefined> {
    return this.db.select().from(schema).where(eq(schema.roleId, roleId)).then(takeOne);
  }

  async getRoles(tenantId: string, entityId: string): Promise<RoleData<TPermissions>[]> {
    return this.db.select({
      roleId: schema.roleId,
      tenantId: schema.tenantId,
      name: schema.name,
      permissions: schema.permissions,
    }).from(schema).innerJoin(
      entitySchema,
      eq(schema.roleId, entitySchema.roleId),
    ).where(and(
      eq(schema.tenantId, tenantId),
      eq(entitySchema.entityId, entityId),
    )).then((data) => {
      if (data.length === 0) {
        return [];
      }
      return override(entityId, data, this.entities);
    });
  }

  async getRolesByTenantId(tenantId: string): Promise<Role[]> {
    return this.db.select().from(schema).where(eq(schema.tenantId, tenantId));
  }

  async getRolesByEntityId(entityId: string): Promise<RoleData<TPermissions>[]> {
    return this.db.select({
      roleId: schema.roleId,
      tenantId: schema.tenantId,
      name: schema.name,
      permissions: schema.permissions,
    }).from(schema).innerJoin(
      entitySchema,
      eq(schema.roleId, entitySchema.roleId),
    ).where(
      eq(entitySchema.entityId, entityId),
    ).then((data) => override(entityId, data, this.entities));
  }

  async setPermissions(roleId: string, permissions: Partial<TPermissions>): Promise<void> {
    await this.db.update(schema).set({ permissions: JSON.stringify(permissions) }).where(eq(schema.roleId, roleId));
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function override(
  entityId: string,
  roles: { roleId: string; tenantId: string; name: string; permissions: string }[],
  entities: EntityProvider<any>,
): Promise<RoleData<any>[]> {
  const result: RoleData<any>[] = [];
  for (const role of roles) {
    const entity = await entities.getEntity(role.roleId, entityId);
    result.push({
      ...role,
      permissions: entity === undefined
        ? JSON.parse(role.permissions)
        : leftFold(JSON.parse(role.permissions), { conditions: entity.conditions, filters: entity.filters }),
    });
  }
  return result;
}

function leftFold(target: any, { conditions, filters }: { conditions: any; filters: any }): any {
  for (const resource in conditions) {
    for (const action in conditions[resource]) {
      if (target[resource] === undefined) {
        target[resource] = {};
      }
      if (target[resource][action] === undefined) {
        target[resource][action] = {};
      }
      target[resource][action].conditions = conditions[resource][action];
    }
  }
  for (const resource in filters) {
    for (const action in filters[resource]) {
      if (target[resource] === undefined) {
        target[resource] = {};
      }
      if (target[resource][action] === undefined) {
        target[resource][action] = {};
      }
      target[resource][action].filter = filters[resource][action];
    }
  }
  return target;
}
