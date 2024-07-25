import type { ActionValidator } from "~libraries/types.ts";

import { Permission } from "./permission.ts";
import type { Role } from "./role.ts";
import type { GetActionValidatorData, Permissions } from "./types.ts";

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
  has<
    TResource extends keyof TPermissions,
    TAction extends keyof TPermissions[TResource],
    TData extends GetActionValidatorData<TPermissions, TResource, TAction>,
  >(
    ...[resourceId, actionId, data = undefined]: void extends TData ? [resourceId: TResource, actionId: TAction]
      : [resourceId: TResource, actionId: TAction, data: TData]
  ): boolean {
    const validator = this.#getActionValidator(resourceId, actionId);

    // ### Validate Assignments
    // Loop through all the roles assigned to the requesting entity. If any
    // of the roles returns 'true' then permission check is 'true'.

    return this.assignments.some(({ permissions }) => {
      const resource = permissions[resourceId];
      if (resource === undefined) {
        return false;
      }

      // ### Action Check
      // If the action is 'undefined' permission is rejected, our logic runs
      // with negative default, making the abscense of a action 'false'. If
      // the value of the action is explicitly 'true', permission is granted.

      const action = resource[actionId];
      if (action === undefined) {
        return false;
      }

      if (action === true) {
        return true;
      }

      // ### Validator Check
      // If the action is a validator, and the action contains the expected
      // 'conditions' key. We run the validate method with the incoming data,
      // and permission conditions.

      if (validator !== undefined) {
        if ("conditions" in action === true && validator.validate(data, action.conditions) === true) {
          return true;
        }
        return false;
      }

      // ### Filter Check
      // If a validator is not present we do a check to see if a filter has
      // been assigned to the action. A 'filter' present along with the
      // abscense of a 'validator' is considered true.

      if ("filter" in action) {
        return true;
      }

      return false;
    });
  }

  /**
   * Perform a permission check on the given resource, action and potential
   * conditional data to validate.
   *
   * @param resource - Resource to check.
   * @param action   - Action within the resource to validate.
   * @param data     - Conditional data to validate. _(Only required when expected)_
   */
  check<
    TResource extends keyof TPermissions,
    TAction extends keyof TPermissions[TResource],
    TData extends GetActionValidatorData<TPermissions, TResource, TAction>,
  >(
    ...[resourceId, actionId, data = undefined]: unknown extends TData ? [resourceId: TResource, actionId: TAction]
      : [resourceId: TResource, actionId: TAction, data: TData]
  ): Permission {
    if (this.has(resourceId, actionId, data!) === false) {
      return new Permission({
        granted: false,
        message: this.#getActionError(resourceId, actionId) ?? "Session is missing one, or more access permissions.",
      });
    }
    return new Permission({
      granted: true,
      filter: this.#getActionFilter(resourceId, actionId),
    });
  }

  /**
   * Get error message defined on the action, or undefined if none has been
   * added to the action.
   *
   * @param resourceId - Resource the action lives under.
   * @param actionId   - Action the error should be registered under.
   */
  #getActionError<TResource extends keyof TPermissions, TAction extends keyof TPermissions[TResource]>(
    resourceId: TResource,
    actionId: TAction,
  ): string | undefined {
    return this.#getActionValidator(resourceId, actionId)?.error;
  }

  /**
   * Get attribute filter defined on the action, or undefined if none has been
   * added to the action.
   *
   * @param resourceId - Resource the action lives under.
   * @param actionId   - Action the filter should be registered under.
   */
  #getActionFilter<TResource extends keyof TPermissions, TAction extends keyof TPermissions[TResource]>(
    resourceId: TResource,
    actionId: TAction,
  ): string[] | undefined {
    let fallback = true;

    const filter = new Set<string>();
    for (const assignment of this.assignments) {
      const action = assignment.permissions[resourceId]?.[actionId];
      if (action === undefined || action === true) {
        continue;
      }
      if ("filter" in action) {
        action.filter.forEach(filter.add, filter);
        fallback = false;
      }
    }

    if (fallback === false) {
      return Array.from(filter);
    }

    const action = this.permissions[resourceId]?.[actionId];
    if (action === undefined || action === true) {
      return undefined;
    }
    return action.filter?.filter;
  }

  /**
   * Get the action validator, or filter instance, or undefined if none has been added.
   *
   * @param resourceId - Resource the action lives under.
   * @param actionId   - Action the validator instance should be registered under.
   */
  #getActionValidator<TResource extends keyof TPermissions, TAction extends keyof TPermissions[TResource]>(
    resourceId: TResource,
    actionId: TAction,
  ): ActionValidator<any, any> | undefined {
    const action = this.permissions[resourceId]?.[actionId];
    if (action === undefined || action === true) {
      return undefined;
    }
    return action.validator;
  }
}
