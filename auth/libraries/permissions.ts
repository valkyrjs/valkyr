/**
 * Permission defines a structure for managing access control within an application.
 * It combines Role-Based Access Control (RBAC) with Attribute-Based Access Control
 * (ABAC) elements, allowing for flexible and granular control over entity permissions.
 *
 * In this model, roles are configured separately from the permissions and are used
 * to compile a comprehensive permission set for each entity request. This allows the
 * system to evaluate combined permissions dynamically.
 *
 * The conditions in this structure represent specific attributes or constraints for
 * more granular access control.
 *
 * @example
 * const permissions = {
 *   document: ["create", "read", "update", "delete"],
 * } as const satisfies Permission;
 */
export type Permissions<TResources extends Record<string, string> = Record<string, string>> = {
  [TResource in keyof TResources]: TResources[TResource][number][];
};

export type PartialPermissions<TPermissions extends Permissions> = {
  [TResource in keyof TPermissions]?: TPermissions[TResource] extends Array<infer TAction> ? TAction[] | undefined : TPermissions[TResource];
};
