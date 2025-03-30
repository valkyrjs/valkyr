import type { PartialPermissions, Permissions } from "./permissions.ts";

export class Role<TPermissions extends Permissions> {
  readonly id: string;
  readonly name: string;
  readonly permissions: PartialPermissions<TPermissions>;

  declare readonly $inferData: RoleData<Permissions>;

  constructor(data: RoleData<TPermissions>) {
    this.id = data.id;
    this.name = data.name;
    this.permissions = data.permissions;
  }

  get grant(): RolePermission<TPermissions>["grant"] {
    return new RolePermission<TPermissions>(this).grant;
  }

  get deny(): RolePermission<TPermissions>["deny"] {
    return new RolePermission<TPermissions>(this).deny;
  }
}

export class RolePermission<TPermissions extends Permissions> {
  readonly #operations: Operation[] = [];

  constructor(readonly role: Role<TPermissions>) {
    this.grant = this.grant.bind(this);
    this.deny = this.deny.bind(this);
  }

  /**
   * List of operations to perform on role permissions.
   */
  get operations(): Operation[] {
    return this.#operations;
  }

  /**
   * Grant action to the provided resource.
   *
   * @param resource - Resource to grant action for.
   * @param action   - Action to grant for the resource.
   */
  grant<TResource extends keyof TPermissions, TAction extends TPermissions[TResource][number]>(resource: TResource, action: TAction): this {
    this.#operations.push({ type: "set", resource, action });
    return this;
  }

  /**
   * Deny action for the provided resource.
   *
   * @param resource - Resource to deny action for.
   * @param action   - Action to deny on the resource.
   */
  deny<TResource extends keyof TPermissions, TAction extends TPermissions[TResource][number]>(resource: TResource, action?: TAction): this {
    this.#operations.push({ type: "unset", resource, action } as any);
    return this;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type RolesProvider<TPermissions extends Permissions, TSession> = {
  /**
   * Add a new role to the providers storage.
   *
   * @param role - Role to add.
   */
  add(role: RoleData<TPermissions>): Promise<void>;

  /**
   * Get a role by its id.
   *
   * @param roleId - Role to retrieve.
   */
  getById(roleId: string): Promise<RoleData<TPermissions> | undefined>;

  /**
   * Get a list of roles related to a session.
   *
   * @param session - Session to retrieve roles for.
   */
  getBySession(session: TSession): Promise<RoleData<TPermissions>[]>;

  /**
   * Set permissions on a role with the given list of patch operations.
   *
   * @param roleId     - Role to set permissions for.
   * @param operations - Patch operations to execute on the providers storage.
   */
  setPermissions(roleId: string, operations: Operation[]): Promise<void>;

  /**
   * Role to delete.
   *
   * @param roleId - Role to delete from providers storage.
   */
  delete(roleId: string): Promise<void>;
};

export type RoleData<TPermissions extends Permissions> = {
  id: string;
  name: string;
  permissions: PartialPermissions<TPermissions>;
};

/**
 * Type defenitions detailing the operation structure of updating a roles
 * permissions layers. This provides the ability for service providers to take
 * a operation set and create its own insert logic.
 */
type Operation =
  | SetOperation
  | UnsetOperation;

type SetOperation = {
  type: "set";
  resource: any;
  action: any;
};

type UnsetOperation = {
  type: "unset";
  resource: any;
  action?: any;
};
