import { a } from "@arrirpc/schema";

import { AccessGuard } from "./guard.ts";

/*
 |--------------------------------------------------------------------------------
 | Roles
 |--------------------------------------------------------------------------------
 */

export type Role<TPermissions extends Permissions> = {
  id: string;
  name: string;
  permissions: Partial<
    {
      [TResource in keyof TPermissions]: Partial<
        {
          [TAction in keyof TPermissions[TResource]]: TPermissions[TResource][TAction] extends AccessGuard<infer _, infer TFlag> ? a.infer<TFlag> : true;
        }
      >;
    }
  >;
};

/*
 |--------------------------------------------------------------------------------
 | Permissions
 |--------------------------------------------------------------------------------
 */

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
 *   document: {
 *     create: true,
 *     read: new AccessGuard({
 *       input: a.object({ documentId: a.string() }),
 *       flag: a.union([a.literal("admin"), a.literal("user")]),
 *       handler: async ({ ownerId }, flag) => {
 *         if (flag === "admin") {
 *           return true;
 *         }
 *         if (flag === "user") {
 *           const document = await db.documents.getById(documentId);
 *           if (document === undefined) {
 *             return false;
 *           }
 *           return req.session.userId === document.ownerId;
 *         }
 *         return false;
 *       },
 *       error: "Does not have permission to read document",
 *     }),
 *     update: true,
 *     delete: true,
 *   },
 * } as const satisfies Permission;
 */
export type Permissions<TPermissions extends Record<string, any> = Record<string, any>> = {
  /**
   * A resource representing an entity or category that can be associated with a
   * collection of actions.
   *
   * In the context of RBAC, this serves as an identifier for resources like
   * documents, profiles, etc.
   */
  [TResource in keyof TPermissions]: {
    /**
     * An action representing a specific operation or behavior that can be
     * performed on a resource.
     */
    [TAction in keyof TPermissions[TResource]]: AccessGuard<any, any> | true;
  };
};

export type GetGuardInput<TAction> = TAction extends AccessGuard<infer TInput, infer _> ? a.infer<TInput>
  : void;
