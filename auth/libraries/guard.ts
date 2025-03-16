import type { TypeOf, ZodTypeAny } from "zod";

/**
 * Conditions under which an action can be performed, allowing for detailed
 * attribute-based control.
 */
export class AccessGuard<TData extends ZodTypeAny, TFlag extends ZodTypeAny> {
  readonly input: TData;
  readonly flag: TFlag;
  readonly check: AccessGuardHandler<TData, TFlag>;

  constructor(options: { input: TData; flag: TFlag; check: AccessGuardHandler<TData, TFlag> }) {
    this.input = options.input;
    this.flag = options.flag;
    this.check = options.check;
  }
}

/**
 * Condition function used to validate incoming data with the flag
 * object defined on a permission action.
 *
 * @param input - Incoming data to validate against the conditions.
 * @param flag  - Flags as stored on the permission action.
 */
export type AccessGuardHandler<TData extends ZodTypeAny, TFlag extends ZodTypeAny> = (
  input: TypeOf<TData>,
  flag: TypeOf<TFlag>,
) => Promise<void>;
