import { AnyZodObject, TypeOf, ZodTypeAny } from "zod";

import { BadRequestError } from "~libraries/errors.ts";

export class Action<
  TProps extends ZodTypeAny | undefined = undefined,
  TOutput extends AnyZodObject | undefined = undefined,
> {
  readonly name: string;

  #props?: TProps;
  #handler: ActionHandler<TProps, TOutput>;

  constructor(options: ActionOptions<TProps, TOutput>) {
    this.name = options.name;
    this.#props = options.props;
    this.#handler = options.handler;
  }

  async handle(context: any) {
    const result = (await this.#props?.spa(context)) ?? { success: true, data: context };
    if (result.success === false) {
      throw new BadRequestError(
        "Invalid action properties",
        result.error.flatten().fieldErrors,
      );
    }
    return this.#handler(result.data);
  }
}

export class Actions<TActions extends Action<any, any>[] = any> {
  constructor(readonly actions: TActions) {}

  declare readonly $inferOutput: ActionResult<TActions>;

  /**
   * Runs through each action that has been registered and returns any combined
   * output generated.
   *
   * @param args - Arguments to pass to the action handlers.
   */
  async run(args: any): Promise<ActionResult<TActions>> {
    let props: any = {};
    for (const action of this.actions) {
      const result = await action.handle(args);
      if (result !== undefined) {
        props = { ...props, ...(result as any) };
      }
    }
    return props;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type ActionOptions<
  TProps extends ZodTypeAny | undefined = undefined,
  TOutput extends AnyZodObject | undefined = undefined,
> = {
  name: string;
  props?: TProps;
  output?: TOutput;
  handler: ActionHandler<TProps, TOutput>;
};

type ActionHandler<
  TProps extends ZodTypeAny | undefined = undefined,
  TOutput extends AnyZodObject | undefined = undefined,
> = TProps extends ZodTypeAny ? (props: TProps) => TOutput extends AnyZodObject ? Promise<TypeOf<TOutput>>
    : Promise<void>
  : () => TOutput extends AnyZodObject ? Promise<TypeOf<TOutput>>
    : Promise<void>;

export type ActionResult<TActions extends Action[]> = UnionToIntersection<GetActionProps<TActions>>;

type GetActionProps<TActions extends Action[]> = TActions[number] extends Action<infer _, infer TOutput> ? TOutput extends AnyZodObject ? TypeOf<TOutput> : object
  : object;

export type Empty = Record<string, never>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I extends U) => void ? I
  : never;
