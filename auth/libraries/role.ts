import type { Repository } from "./repository.ts";
import { RolePermission } from "./role-permissions.ts";
import type { Permissions, RoleData, RoleEntityAssignments, RolePermissions } from "./types.ts";

export class Role<TPermissions extends Permissions> {
  readonly roleId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly permissions: RolePermissions<TPermissions>;

  readonly #repository: Repository<TPermissions>;

  constructor(data: RoleData<TPermissions>, repository: Repository<TPermissions>) {
    this.roleId = data.roleId;
    this.tenantId = data.tenantId;
    this.name = data.name;
    this.permissions = data.permissions;
    this.#repository = repository;
  }

  /*
   |--------------------------------------------------------------------------------
   | Permissions
   |--------------------------------------------------------------------------------
   */

  get grant(): RolePermission<TPermissions>["grant"] {
    return new RolePermission<TPermissions>(this, this.#repository).grant;
  }

  get deny(): RolePermission<TPermissions>["deny"] {
    return new RolePermission<TPermissions>(this, this.#repository).deny;
  }

  /*
   |--------------------------------------------------------------------------------
   | Accounts
   |--------------------------------------------------------------------------------
   */

  async addEntity(entityId: string, assignments?: RoleEntityAssignments<TPermissions>) {
    await this.#repository.addEntity(this.roleId, entityId, assignments);
  }

  async delEntity(entityId: string) {
    await this.#repository.delEntity(this.roleId, entityId);
  }

  /*
   |--------------------------------------------------------------------------------
   | Methods
   |--------------------------------------------------------------------------------
   */

  update({ name, permissions }: UpdatePayload<TPermissions>): Role<TPermissions> {
    return new Role({
      roleId: this.roleId,
      tenantId: this.tenantId,
      name: name ?? this.name,
      permissions: permissions ?? this.permissions,
    }, this.#repository);
  }

  /*
   |--------------------------------------------------------------------------------
   | Serializers
   |--------------------------------------------------------------------------------
   */

  toJSON(): {
    roleId: string;
    tenantId: string;
    name: string;
    permissions: RolePermissions<TPermissions>;
  } {
    return {
      roleId: this.roleId,
      tenantId: this.tenantId,
      name: this.name,
      permissions: this.permissions,
    };
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type UpdatePayload<TPermissions extends Permissions> = {
  name?: string;
  permissions?: RolePermissions<TPermissions>;
};
