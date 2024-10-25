import { takeOne } from "@valkyr/drizzle";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import type { Permissions, RoleData, RolePayload } from "~libraries/types.ts";

import type { PostgresDatabase } from "../database.ts";
import type { EntityProvider } from "../entities/provider.ts";
import { entities } from "../entities/schema.ts";
import { type Role, roles } from "./schema.ts";

export class RoleProvider<TPermissions extends Permissions> {
  constructor(readonly db: PostgresDatabase, readonly entities: EntityProvider<TPermissions>) {}

  async addRole(payload: RolePayload<TPermissions>): Promise<string> {
    const id = nanoid();
    await this.db.insert(roles).values({
      id,
      ...payload,
      permissions: JSON.stringify(payload.permissions),
    });
    return id;
  }

  async getRoleById(roleId: string): Promise<Role | undefined> {
    return this.db.select().from(roles).where(eq(roles.id, roleId)).then(takeOne);
  }

  async getRoles(tenantId: string, entityId: string): Promise<RoleData<TPermissions>[]> {
    return this.db.select({
      id: roles.id,
      tenantId: roles.tenantId,
      name: roles.name,
      permissions: roles.permissions,
    }).from(roles).innerJoin(
      entities,
      eq(roles.id, entities.roleId),
    ).where(and(
      eq(roles.tenantId, tenantId),
      eq(entities.entityId, entityId),
    )).then((data) => {
      if (data.length === 0) {
        return [];
      }
      return override(entityId, data, this.entities);
    });
  }

  async getRolesByTenantId(tenantId: string): Promise<Role[]> {
    return this.db.select().from(roles).where(eq(roles.tenantId, tenantId));
  }

  async getRolesByEntityId(entityId: string): Promise<RoleData<TPermissions>[]> {
    return this.db.select({
      id: roles.id,
      tenantId: roles.tenantId,
      name: roles.name,
      permissions: roles.permissions,
    }).from(roles).innerJoin(
      entities,
      eq(roles.id, entities.roleId),
    ).where(
      eq(entities.entityId, entityId),
    ).then((data) => override(entityId, data, this.entities));
  }

  async setPermissions(roleId: string, permissions: Partial<TPermissions>): Promise<void> {
    await this.db.update(roles).set({ permissions: JSON.stringify(permissions) }).where(eq(roles.id, roleId));
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function override(
  entityId: string,
  roles: { id: string; tenantId: string; name: string; permissions: string }[],
  entities: EntityProvider<any>,
): Promise<RoleData<any>[]> {
  const result: RoleData<any>[] = [];
  for (const role of roles) {
    const entity = await entities.getEntity(role.id, entityId);
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
