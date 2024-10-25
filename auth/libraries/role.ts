import type { Repository } from "./repository.ts";
import { RolePermission } from "./role-permissions.ts";
import type { Permissions, RoleData, RoleEntityAssignments, RolePermissions } from "./types.ts";

export class Role<TPermissions extends Permissions> {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly permissions: RolePermissions<TPermissions>;

  readonly #repository: Repository<TPermissions>;

  constructor(data: RoleData<TPermissions>, repository: Repository<TPermissions>) {
    this.id = data.id;
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
    await this.#repository.addEntity(this.id, entityId, assignments);
  }

  async delEntity(entityId: string) {
    await this.#repository.delEntity(this.id, entityId);
  }

  /*
   |--------------------------------------------------------------------------------
   | Methods
   |--------------------------------------------------------------------------------
   */

  update({ name, permissions }: UpdatePayload<TPermissions>): Role<TPermissions> {
    return new Role({
      id: this.id,
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
    id: string;
    tenantId: string;
    name: string;
    permissions: RolePermissions<TPermissions>;
  } {
    return {
      id: this.id,
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
