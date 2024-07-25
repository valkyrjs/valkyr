import type { TypeOf, ZodTypeAny } from "zod";

/*
 |--------------------------------------------------------------------------------
 | Roles
 |--------------------------------------------------------------------------------
 */

/**
 * Role permissions creates a map of resource action values. Mapping conditional
 * actions to its conditions value, or true as it is stored in the database.
 */
export type RolePermissions<TPermissions extends Permissions> = Partial<
  {
    /**
     * Resource the role has access to as defined in the permissions of the role
     * storage solution.
     */
    [TResource in keyof TPermissions]: Partial<
      {
        /**
         * Action within the given resource the role can perform. Houses either a
         * conditional value, or true.
         */
        [TAction in keyof TPermissions[TResource]]: TPermissions[TResource][TAction] extends
          { validator: ActionValidator<any, infer TConditions> }
          ? TPermissions[TResource][TAction] extends { filter: ActionFilter<infer TFilter> } ? {
              validator: TypeOf<TConditions>;
              filter: TFilter;
            }
          : {
            conditions: TypeOf<TConditions>;
          }
          : TPermissions[TResource][TAction] extends { filter: ActionFilter<infer TFilter> } ? {
              filter: TFilter;
            }
          : true;
      }
    >;
  }
>;

export type RoleEntityAssignments<TPermissions extends Permissions = Permissions> = Partial<
  {
    conditions?: EntityConditions<TPermissions>;
    filters?: EntityFilters<TPermissions>;
  }
>;

export type EntityConditions<TPermissions extends Permissions> = Partial<
  {
    [TResource in keyof TPermissions]: Partial<
      {
        [TAction in keyof TPermissions[TResource]]: TPermissions[TResource][TAction] extends
          { validator: ActionValidator<any, infer TConditions> } ? TypeOf<TConditions> : void;
      }
    >;
  }
>;

export type EntityFilters<TPermissions extends Permissions> = Partial<
  {
    [TResource in keyof TPermissions]: Partial<
      {
        [TAction in keyof TPermissions[TResource]]: TPermissions[TResource][TAction] extends
          { filter: ActionFilter<infer TFilter> } ? TFilter : void;
      }
    >;
  }
>;

export type RolePayload<TPermissions extends Permissions> = {
  tenantId: string;
  name: string;
  permissions: RolePermissions<TPermissions>;
};

export type RoleData<TPermissions extends Permissions> = {
  roleId: string;
  tenantId: string;
  name: string;
  permissions: RolePermissions<TPermissions>;
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
 *     read: new ActionValidator({
         data: z.array(z.string()),
         conditions: z.object({
           attributes: z.array(z.string()),
         }),
         validate: (data, conditions) => {
           return data.every((attr) => conditions.attributes.includes(attr));
         },
         error: "Does not have permission to read document",
       }),
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
    [TAction in keyof TPermissions[TResource]]: {
      validator?: ActionValidator<any, any>;
      filter?: ActionFilter<any>;
    } | true;
  };
};

/**
 * Retrieve the data defined on the given resource action.
 *
 * For an action that has conditional configuration the defined data key is
 * returned, else void is presented.
 */
export type GetActionValidatorData<
  TPermissions extends Permissions,
  TResource extends keyof TPermissions,
  TAction extends keyof TPermissions[TResource],
> = TPermissions[TResource][TAction] extends { validator: ActionValidator<infer TData, any> } ? TypeOf<TData> : void;

/**
 * Retrieve the conditions defined on the given resource action.
 *
 * For an action that has conditional configuration the defined conditions key is
 * returned, else void is presented.
 */
export type GetActionValidatorConditions<
  TPermissions extends Permissions,
  TResource extends keyof TPermissions,
  TAction extends keyof TPermissions[TResource],
> = TPermissions[TResource][TAction] extends { validator: ActionValidator<any, infer TConditions> }
  ? TypeOf<TConditions>
  : void;

export class ActionFilter<TFilter extends string[]> {
  constructor(readonly filter: TFilter) {}
}

/**
 * Conditions under which an action can be performed, allowing for detailed
 * attribute-based control.
 */
export class ActionValidator<TData extends ZodTypeAny, TConditions extends ZodTypeAny> {
  readonly data: TData;
  readonly conditions: TConditions;
  readonly validate: ConditionFn<TData, TConditions>;
  readonly error: string;

  constructor(
    options: {
      data: TData;
      conditions: TConditions;
      validate: ConditionFn<TData, TConditions>;
      error: string;
    },
  ) {
    this.data = options.data;
    this.conditions = options.conditions;
    this.validate = options.validate;
    this.error = options.error;
  }
}

/**
 * Condition function used to validate incoming data with the conditions
 * object defined on a permission action.
 *
 * @param data       - Incoming data to validate against the conditions.
 * @param conditions - Conditional data as stored on the permission instance.
 */
export type ConditionFn<TData extends ZodTypeAny, TConditions extends ZodTypeAny> = (
  data: TypeOf<TData>,
  conditions: TypeOf<TConditions>,
) => boolean;

/**
 * Type defenitions detailing the operation structure of updating a roles
 * permissions layers. This provides the ability for service providers to take
 * a operation set and create its own insert logic.
 */
export type Operation =
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
