import type { Role } from "./role.ts";
import type {
  EntityConditions,
  EntityFilters,
  Operation,
  Permissions,
  RoleEntityAssignments,
  RolePayload,
  RolePermissions,
} from "./types.ts";

export type Repository<TPermissions extends Permissions> = {
  /**
   * Add a new role to the persistence storage.
   *
   * @param payload - Role to add to the database.
   */
  addRole(payload: RolePayload<TPermissions>): Promise<Role<TPermissions>>;

  /**
   * Get a role from the persisted storage.
   *
   * @param roleId - Role id to get from the database.
   */
  getRole(roleId: string): Promise<Role<TPermissions> | undefined>;

  /**
   * Get roles for a entity under the given tenant.
   *
   * @param tenantId - Tenant the assignment resides under.
   * @param entityId - Entity to get permissions for.
   */
  getRoles(tenantId: string, entityId: string): Promise<Role<TPermissions>[]>;

  /**
   * Get all roles created for a specific tenant.
   *
   * @param tenantId - Tenant to retrieve roles for.
   */
  getRolesByTenantId(tenantId: string): Promise<Role<TPermissions>[]>;

  /**
   * Get all roles assigned to a specific entity.
   *
   * @param entityId - Entity to retrieve roles for.
   */
  getRolesByEntityId(entityId: string): Promise<Role<TPermissions>[]>;

  /**
   * Add entity to an existing role.
   *
   * @param roleId      - Role to assign the entity to.
   * @param entityId    - Entity to assign to the role.
   * @param assignments - Unique conditions and filter assignments for the entity. _(Optional)_
   */
  addEntity(roleId: string, entityId: string, assignments?: RoleEntityAssignments<TPermissions>): Promise<void>;

  /**
   * Set custom entity conditions.
   *
   * @param roleId     - Role to assign the entity to.
   * @param entityId   - Entity to assign to the role.
   * @param conditions - Unique conditions assignment for the entity. _(Optional)_
   */
  setConditions(roleId: string, entityId: string, conditions: EntityConditions<TPermissions>): Promise<void>;

  /**
   * Set custom entity filters.
   *
   * @param roleId   - Role to assign the entity to.
   * @param entityId - Entity to assign to the role.
   * @param filters  - Unique filters assignment for the entity. _(Optional)_
   */
  setFilters(roleId: string, entityId: string, filters: EntityFilters<TPermissions>): Promise<void>;

  /**
   * Remove a entity from an existing role.
   *
   * @param roleId   - Role to remove the entity from.
   * @param entityId - Entity to remove from the role.
   */
  delEntity(roleId: string, entityId: string): Promise<void>;

  /**
   * Update a role with the provided grant and ungrant operations.
   *
   * @param roleId     - Role id to update.
   * @param operations - Grant and ungrant operations to execute.
   */
  setPermissions(roleId: string, operations: Operation[]): Promise<RolePermissions<TPermissions>>;
};
