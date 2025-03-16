export const PERMISSION_DENIED_MESSAGE = "Permission denied";

import type { Permissions, Role } from "~libraries/types.ts";

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
   * @param data     - Data schema for action. _(Optional)_
   */
  grant<R extends keyof TPermissions, A extends keyof TPermissions[R], D extends Data<TPermissions, R, A>>(
    ...[resource, action, data = undefined]: unknown extends D ? [resource: R, action: A]
      : [resource: R, action: A, data: D]
  ): this {
    this.#operations.push({ type: "set", resource, action, data } as any);
    return this;
  }

  /**
   * Deny action for the provided resource.
   *
   * @param resource - Resource to deny action for.
   * @param action   - Action to deny on the resource.
   */
  deny<R extends keyof TPermissions, A extends keyof TPermissions[R]>(resource: R, action?: A): this {
    this.#operations.push({ type: "unset", resource, action } as any);
    return this;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type Permission = { granted: true } | { granted: false; message: string };

type Data<
  TPermissions extends Permissions,
  TResource extends keyof TPermissions,
  TAction extends keyof TPermissions[TResource],
> = TPermissions[TResource][TAction] extends boolean ? unknown
  : TPermissions[TResource][TAction];

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
  resource: string;
  action: string;
  data?: Record<string, unknown>;
};

type UnsetOperation = {
  type: "unset";
  resource: string;
  action?: string;
};
