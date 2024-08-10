import type { AnyZodObject, TypeOf, ZodTypeAny } from "zod";

import { Action } from "./action.ts";

export class Route<
  TPath extends string = string,
  TParams extends AnyZodObject | undefined = undefined,
  TQuery extends AnyZodObject | undefined = undefined,
  TActions extends Action[] = [],
> {
  readonly path: TPath;
  readonly params?: ZodTypeAny;
  readonly query?: ZodTypeAny;
  readonly actions?: TActions;
  readonly handle: RouteHandler<TParams, TQuery>;

  declare readonly $inferContext: Context<TParams, TQuery>;

  #pattern?: URLPattern;

  constructor({ path, params, query, actions, handle }: RouteOptions<TPath, TParams, TQuery, TActions>) {
    this.path = this.#getPath(path);
    this.params = params;
    this.query = query;
    this.actions = actions;
    this.handle = handle;
  }

  #getPath(path: string): TPath {
    if (path === "" || path === "/") {
      return "/" as TPath;
    }
    return path.replace(/\/$/, "") as TPath;
  }

  /**
   * Get the URL pattern of the route.
   */
  get pattern(): URLPattern {
    if (this.#pattern === undefined) {
      this.#pattern = new URLPattern({ pathname: this.path });
    }
    return this.#pattern;
  }

  /**
   * Check if the provided path matches with the route path.
   *
   * @param path - Path to match with the route.
   */
  test(path: string): boolean {
    return this.pattern.test(this.getUrl(path));
  }

  /**
   * Extract parameters from the provided path relative to the route.
   *
   * @param path - Path to get params for.
   */
  getParams(path: string): RouteParams {
    const params = this.pattern.exec(this.getUrl(path))?.pathname.groups;
    if (params === undefined) {
      return {};
    }
    return params;
  }

  /**
   * Get the provided path with prefixed base url.
   */
  getUrl(path: string): string {
    return `http://localhost${path}`;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type RouteOptions<
  TPath extends string = string,
  TParams extends AnyZodObject | undefined = undefined,
  TQuery extends AnyZodObject | undefined = undefined,
  TActions extends Action[] = [],
> = {
  /**
   * Endpoint which should trigger the route.
   *
   * @example
   * ```ts
   * new Route({ path: "/foo/bar", actions: [...] });
   * ```
   */
  path: TPath;

  /**
   * Params of the request using Zod validation and casting before passing
   * it to the route handler context under the `params` key.
   *
   * @example
   * ```ts
   * new Route({
   *   path: "/foo/:bar",
   *   params: z.object({
   *     bar: z.string()
   *   }),
   * })
   * ```
   */
  params?: TParams;

  /**
   * Query of the request using Zod validation and casting before passing
   * it to the route handler context under the `query` key.
   *
   * @example
   * ```ts
   * new Route({
   *   path: "/foo",
   *   query: z.object({
   *     bar: z.string().optional()
   *   }),
   * });
   * ```
   */
  query?: TQuery;

  /**
   * List of methods to execute before the main handler method. Data returned
   * from actions is compiled and added to the context of the request.
   */
  actions?: TActions;

  /**
   * Route handler which prepares and passes components to the onRender
   * method on the parent router.
   */
  handle: RouteHandler<TParams, TQuery>;
};

type RouteHandler<
  TParams extends AnyZodObject | undefined = undefined,
  TQuery extends AnyZodObject | undefined = undefined,
> = (context: Context<TParams, TQuery>) => Promise<any>;

export type Context<
  TParams extends AnyZodObject | undefined = undefined,
  TQuery extends AnyZodObject | undefined = undefined,
> = TParams extends AnyZodObject
  ? TQuery extends AnyZodObject
    ? { params: TypeOf<TParams>; query: TypeOf<TQuery> }
    : { params: TypeOf<TParams> }
  : TQuery extends AnyZodObject
    ? { query: TypeOf<TQuery> }
    : never;

export type RouteParams = Record<string, string | undefined>;

export type AnyRoute<
  TPath extends string = string,
  TParams extends AnyZodObject | undefined = any,
  TQuery extends AnyZodObject | undefined = any,
  TActions extends Action[] = any,
> = Route<TPath, TParams, TQuery, TActions>;
