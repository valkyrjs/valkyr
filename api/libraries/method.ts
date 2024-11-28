import type { RpcError } from "@valkyr/json-rpc";
import type { z, ZodArray, ZodTypeAny } from "zod";

import { dedent } from "~utilities/dedent.ts";

import { ActionResult, Actions } from "./action.ts";

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
  TActions extends Actions | undefined = undefined,
  TParams extends ZodMethodType | undefined = undefined,
  TResult extends ZodMethodType | undefined = undefined,
> {
  readonly description: string;
  readonly notification: boolean;
  readonly actions?: TActions;
  readonly params?: ZodTypeAny;
  readonly result?: TResult;
  readonly handler: MethodHandler<TActions, TParams, TResult>;
  readonly examples?: string[];

  #meta?: {
    method: string;
    file: string;
    location: string[];
  };

  constructor(options: MethodOptions<TActions, TParams, TResult>) {
    this.description = options.description;
    this.notification = options.notification ?? false;
    this.actions = options.actions;
    this.params = options.params;
    this.result = options.result;
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
    this.#meta = {
      method: `${location.join(":")}:${file}`,
      file,
      location,
    };
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type AnyMethod = Method<any, any, any>;

export type MethodOptions<
  TActions extends Actions | undefined = undefined,
  TParams extends ZodMethodType | undefined = undefined,
  TResult extends ZodMethodType | undefined = undefined,
> = {
  /**
   * Describes the intent of the methods behavior used by client genreation
   * tools to document the function result.
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
   *   params: z.object({
   *     name: z.string().min(1).max(255),
   *     age: z.number().int().positive(),
   *   }),
   *   result: z.object({
   *     name: z.string().min(1).max(255),
   *     age: z.number().int().positive(),
   *   }),
   *   handler: async ({ body }) => {
   *     return { name: body.name, age: body.age };
   *   }
   * });
   */
  params?: TParams;

  /**
   * Response produced by the method handler.
   */
  result?: TResult;

  /**
   * Route handler which will be executed when the method is triggered.
   *
   * @example
   *
   * new Route({
   *   method: "Users.Create",
   *   params: z.string().min(1).max(255),
   *   result: z.string(),
   *   handler: async ({ body }) => {
   *     return `Hello, ${body.name}!`;
   *   }
   * });
   */
  handler: MethodHandler<TActions, TParams, TResult>;

  /**
   * Examples for how to call the method.
   */
  examples?: string[];
};

type MethodHandler<
  TActions extends Actions | undefined = undefined,
  TParams extends ZodMethodType | undefined = undefined,
  TResult extends ZodMethodType | undefined = undefined,
> = (
  context: RequestContext<TActions, TParams>,
) => TResult extends ZodMethodType ? Promise<z.infer<TResult> | RpcError>
  : Promise<RpcError | void>;

type RequestContext<
  TActions extends Actions | undefined = undefined,
  TParams extends ZodMethodType | undefined = undefined,
> =
  & (TParams extends ZodMethodType ? { params: z.infer<TParams> } : object)
  & (TActions extends Actions ? ActionResult<TActions["actions"]> : object);

type ZodMethodType = ZodTypeAny | ZodArray<ZodTypeAny>;
