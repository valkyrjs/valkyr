import { a, type ASchema } from "@arrirpc/schema";

import type { CompiledASchema } from "../utilities/arri.ts";

/**
 * Conditions under which an action can be performed, allowing for detailed
 * attribute-based control.
 */
export class AccessGuard<TData extends ASchema, TFlag extends ASchema> {
  readonly input: CompiledASchema<TData>;
  readonly flag: CompiledASchema<TFlag>;
  readonly check: AccessGuardHandler<TData, TFlag>;

  constructor(options: { input: TData; flag: TFlag; check: AccessGuardHandler<TData, TFlag> }) {
    this.input = a.compile(options.input);
    this.flag = a.compile(options.flag);
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
export type AccessGuardHandler<TData extends ASchema, TFlag extends ASchema> = (
  input: a.infer<TData>,
  flag: a.infer<TFlag>,
) => Promise<void>;
