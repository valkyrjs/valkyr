import { takeOne } from "@valkyr/drizzle";
import { and, eq } from "drizzle-orm";

import type { Permissions, RoleEntityAssignments } from "~libraries/types.ts";

import type { PostgresDatabase } from "../database.ts";
import { entities, type Entity } from "./schema.ts";

export class EntityProvider<TPermissions extends Permissions> {
  constructor(readonly db: PostgresDatabase) {}

  async addEntity(roleId: string, entityId: string, assignments: RoleEntityAssignments<TPermissions> = {}): Promise<void> {
    await this.db.insert(entities).values({
      entityId,
      roleId,
      conditions: assignments.conditions,
      filters: assignments.filters,
    });
  }

  async getEntity(roleId: string, entityId: string): Promise<Entity | undefined> {
    return this.db.select().from(entities).where(and(eq(entities.roleId, roleId), eq(entities.entityId, entityId))).then(takeOne);
  }

  async setConditions(roleId: string, entityId: string, conditions: any): Promise<void> {
    await this.db.update(entities).set({ conditions }).where(
      and(eq(entities.roleId, roleId), eq(entities.entityId, entityId)),
    );
  }

  async setFilters(roleId: string, entityId: string, filters: any): Promise<void> {
    await this.db.update(entities).set({ filters }).where(
      and(eq(entities.roleId, roleId), eq(entities.entityId, entityId)),
    );
  }

  async delEntity(roleId: string, entityId: string): Promise<void> {
    await this.db.delete(entities).where(and(
      eq(entities.roleId, roleId),
      eq(entities.entityId, entityId),
    ));
  }
}
