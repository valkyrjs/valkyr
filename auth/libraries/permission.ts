import { getProperty } from "dot-prop";

import type { Operation, Permissions, Role } from "./types.ts";

export const PERMISSION_DENIED_MESSAGE = "Permission denied";

/*
 |--------------------------------------------------------------------------------
 | Permission
 |--------------------------------------------------------------------------------
 */

export class Permission {
  readonly granted: boolean;

  readonly message?: string;
  readonly attributes?: string[];

  constructor(response: Response) {
    this.granted = response.granted === true;
    if (response.granted === true && response.filter) {
      this.attributes = response.filter;
    }
    if (response.granted === false && response.message) {
      this.message = response.message;
    }
  }

  filter<Data extends Record<string, unknown>>(data: Data | Data[]): Data | Data[] {
    const attributes = this.attributes;
    if (attributes === undefined) {
      return data;
    }
    if (Array.isArray(data)) {
      return data.map((data) => filterWithAttributes(data, attributes) as Data);
    }
    return filterWithAttributes(data, attributes) as Data;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Builder
 |--------------------------------------------------------------------------------
 */

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
 | Helpers
 |--------------------------------------------------------------------------------
 */

function filterWithAttributes(data: Record<string, unknown>, keys: string[]) {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    result[key] = getProperty(data, key);
  }
  return result;
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Response = Granted | Denied;

type Granted = {
  granted: true;
  filter?: string[];
};

type Denied = {
  granted: false;
  message?: string;
};

type Data<
  TPermissions extends Permissions,
  TResource extends keyof TPermissions,
  TAction extends keyof TPermissions[TResource],
> = TPermissions[TResource][TAction] extends boolean ? unknown
  : TPermissions[TResource][TAction];
