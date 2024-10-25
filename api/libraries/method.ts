import type { RpcError } from "@valkyr/json-rpc";
import type { z, ZodArray, ZodTypeAny } from "zod";

import { dedent } from "~utilities/dedent.ts";

import type { Action, RequestContext } from "./action.ts";

/*
 |--------------------------------------------------------------------------------
 | Method
 |--------------------------------------------------------------------------------
 |
 | A simple passthrough wrapper constructing a method object that can be consumed
 | by the API server. It provides the handler with the type context resulting from
 | the optional params and actions provided.
 |
 */

export class Method<
  TContext extends RequestContext = RequestContext,
  TActions extends Action<any>[] = any,
  TParams extends ZodMethodType = ZodMethodType,
  TOutput extends ZodMethodType | undefined = any,
> {
  readonly description: string;
  readonly notification: boolean;
  readonly actions: TActions;
  readonly params?: ZodTypeAny;
  readonly output?: TOutput;
  readonly handler: MethodHandler<TContext, TActions, TParams, TOutput>;
  readonly examples?: string[];

  #meta?: {
    method: string;
    file: string;
    location: string[];
  };

  constructor(options: MethodOptions<TContext, TActions, TParams, TOutput>) {
    this.description = options.description;
    this.notification = options.notification ?? false;
    this.actions = options.actions ?? [] as unknown as TActions;
    this.params = options.params;
    this.output = options.output;
    this.handler = options.handler;
    this.examples = options.examples?.map((example) => dedent(example));
  }

  /**
   * Get the assigned method name.
   */
  get method(): string {
    if (this.#meta === undefined) {
      throw new Error("Route Violation: Cannot get 'method', meta data has not been resolved.");
    }
    return this.#meta.method;
  }

  /**
   * Get the name of the file this method was registered in.
   */
  get file(): string {
    if (this.#meta === undefined) {
      throw new Error("Route Violation: Cannot get 'file', meta data has not been resolved.");
    }
    return this.#meta.file;
  }

  /**
   * Get the location array of the route. This is the base folder locations of
   * the route used in client generation.
   *
   * When the route is located in `foo/routes/bar/get-bars.ts` the location
   * will be `["foo", "bar"]`.
   */
  get location(): string[] {
    if (this.#meta === undefined) {
      throw new Error("Route Violation: Cannot get 'location', meta data has not been resolved.");
    }
    return this.#meta.location;
  }

  /**
   * Set the file meta details of the method which is used for api printer.
   *
   * When the method is located in `foo/methods/bar/get-bars.ts` the file will
   * be `get-bars.ts` and the location will be `["foo", "bar"]`.
   *
   * @param file     - Name of the file the method resides within.
   * @param location - Nested location the method file is located.
   */
  meta(file: string, location: string[]) {
    this.#meta = { method: `${location.join(":")}:${file}`, file, location };
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type AnyMethod = Method<any, any, any>;

export type MethodOptions<
  TContext extends RequestContext = RequestContext,
  TActions extends Action<any>[] = [],
  TParams extends ZodMethodType = ZodMethodType,
  TOutput extends ZodMethodType | undefined = any,
> = {
  /**
   * Describes the intent of the methods behavior used by client genreation
   * tools to document the function output.
   */
  description: string;

  /**
   * Is this endpoint a notification, in which case it will not produce
   * a response for the request.
   */
  notification?: boolean;

  /**
   * A list of methods to execute before the request is passed to the method
   * handler. This can be used to perform a wide variety of tasks.
   *
   * @example
   *
   * new Method({ method: "Users.Create", actions: [isAuthenticated] });
   */
  actions?: TActions;

  /**
   * The params of the request using Zod validation and casting before passing
   * it to the method handler context under the JSON-RPC 2.0 `params` key.
   *
   * @example
   *
   * import { Method } from "@valkyr/api";
   *
   * new Method({
   *   method: "Users.Create",
   *   params: {
   *     name: z.string().min(1).max(255),
   *     age: z.number().int().positive(),
   *   },
   *   handler: async ({ body }) => {
   *     return { name: body.name, age: body.age };
   *   }
   * });
   */
  params?: TParams;

  /**
   * Response output produced by the method handler.
   */
  output?: TOutput;

  /**
   * Route handler which will be executed when the method is triggered.
   *
   * @example
   *
   * new Route({
   *   method: "Users.Create",
   *   params: z.string().min(1).max(255),
   *   handler: async ({ body }) => {
   *     return `Hello, ${body.name}!`;
   *   }
   * });
   */
  handler: MethodHandler<TContext, TActions, TParams, TOutput>;

  /**
   * Examples for how to call the method.
   */
  examples?: string[];
};

type MethodHandler<
  TContext extends RequestContext = RequestContext,
  TActions extends Action<any>[] = [],
  TParams extends ZodMethodType | undefined = undefined,
  TOutput extends ZodMethodType | undefined = any,
> = (
  context:
    & TContext
    & (TParams extends ZodMethodType ? { params: z.infer<TParams> } : object)
    & (TActions extends [] ? object
      : {
        [K in keyof TActions]: TActions[K] extends Action<infer P> ? P : never;
      }[number]),
) => TOutput extends ZodMethodType ? Promise<z.infer<TOutput> | RpcError>
  : Promise<RpcError | void>;

type ZodMethodType = ZodTypeAny | ZodArray<ZodTypeAny>;
