import type { Repository } from "./repository.ts";
import type { Role } from "./role.ts";
import type { Operation, Permissions } from "./types.ts";

export class RolePermission<TPermissions extends Permissions> {
  readonly operations: Operation[] = [];

  readonly #repository: Repository<TPermissions>;

  constructor(readonly role: Role<TPermissions>, repository: Repository<TPermissions>) {
    this.#repository = repository;
    this.grant = this.grant.bind(this);
    this.deny = this.deny.bind(this);
    this.commit = this.commit.bind(this);
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
    this.operations.push({ type: "set", resource, action, data } as any);
    return this;
  }

  /**
   * Deny action for the provided resource.
   *
   * @param resource - Resource to deny action for.
   * @param action   - Action to deny on the resource.
   */
  deny<R extends keyof TPermissions, A extends keyof TPermissions[R]>(resource: R, action?: A): this {
    this.operations.push({ type: "unset", resource, action } as any);
    return this;
  }

  /**
   * Commits the grants and denials to the database.
   */
  async commit(): Promise<Role<TPermissions>> {
    return this.role.update({
      permissions: await this.#repository.setPermissions(this.role.roleId, this.operations),
    });
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Data<
  TPermissions extends Permissions,
  TResource extends keyof TPermissions,
  TAction extends keyof TPermissions[TResource],
> = TPermissions[TResource][TAction] extends boolean ? unknown
  : TPermissions[TResource][TAction];
