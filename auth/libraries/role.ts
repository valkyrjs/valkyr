import type { PartialPermissions, Permissions } from "./permissions.ts";

export class Role<TPermissions extends Permissions> {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly permissions: PartialPermissions<TPermissions>,
  ) {}

  get grant() {
    return new RolePermission<TPermissions>(this).grant;
  }

  get deny() {
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
