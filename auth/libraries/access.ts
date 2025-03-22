import { AccessGuard } from "./guard.ts";
import { Permission } from "./permission.ts";
import type { GetGuardInput, Permissions, Role } from "./types.ts";

export class Access<TPermissions extends Permissions> {
  constructor(
    readonly permissions: TPermissions,
    readonly assignments: Role<TPermissions>[],
  ) {}

  /**
   * Check if the access instance has been assigned permissions for the given
   * resource action pair.
   *
   * @param resource - Resource to check assignment for.
   * @param action   - Action to check assignment for.
   */
  async has<
    TResource extends keyof TPermissions,
    TAction extends keyof TPermissions[TResource],
    TData extends GetGuardInput<TPermissions[TResource][TAction]>,
  >(
    ...[resourceId, actionId, data = undefined]: void extends TData ? [resourceId: TResource, actionId: TAction]
      : [resourceId: TResource, actionId: TAction, data: TData]
  ): Promise<Permission> {
    if (this.assignments.length === 0) {
      return {
        granted: false,
        message: "Session has no roles assigned.",
      };
    }

    let message = "Forbidden";

    for (const { permissions } of this.assignments) {
      const resource = permissions[resourceId];
      if (resource === undefined) {
        continue;
      }

      const flag = resource[actionId];
      if (flag === undefined) {
        continue;
      }

      const guard = this.permissions[resourceId]?.[actionId];

      if (guard === undefined) {
        continue;
      }

      if (guard instanceof AccessGuard) {
        if (data === null) {
          return { granted: true };
        }

        const result = await guard.input.spa(data);
        if (result.success === false) {
          continue;
        }

        try {
          await guard.check(result.data, flag);
        } catch (error) {
          if (error instanceof Error) {
            message = error.message;
          }
          continue;
        }
      }

      if (guard === true) {
        return { granted: true };
      }

      return { granted: true };
    }

    return { granted: false, message };
  }
}
