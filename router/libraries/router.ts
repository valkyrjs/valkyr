import type { BrowserHistory, HashHistory, MemoryHistory } from "history";

import {
  BadRequestResponse,
  ForbiddenResponse,
  InternalServiceError,
  NotFoundResponse,
  RouteResponse,
  UnauthorizedResponse,
} from "./responses.ts";
import type { AnyRoute } from "./route.ts";

export class Router<TRoutes extends AnyRoute[] = AnyRoute[]> {
  readonly history: BrowserHistory | HashHistory | MemoryHistory;
  readonly routes: TRoutes;

  #onRender?: OnRenderHandler;
  #onError?: OnErrorHandler;

  #destroy?: () => void;

  constructor(history: BrowserHistory | HashHistory | MemoryHistory, routes: TRoutes) {
    this.history = history;
    this.routes = routes.sort(byStaticPriority);
  }

  /*
   |--------------------------------------------------------------------------------
   | Handlers
   |--------------------------------------------------------------------------------
   */

  /**
   * Register render handler receiving the component and props to render.
   *
   * @param handler - Handler method for incoming components and props.
   */
  onRender(handler: OnRenderHandler): this {
    this.#onRender = handler.bind(handler);
    return this;
  }

  /**
   * Register error handler receiving the error to render.
   *
   * @param handler - Handler method for incoming errors.
   */
  onError(handler: OnErrorHandler): this {
    this.#onError = handler.bind(handler);
    return this;
  }

  /*
   |--------------------------------------------------------------------------------
   | Listeners
   |--------------------------------------------------------------------------------
   */

  listen(initHistory = true): this {
    if (this.#destroy !== undefined) {
      this.#destroy();
    }

    // ### History Listener
    // Register a listener for history changes that results in triggering
    // a new route resolution.

    this.#destroy = this.history.listen(async ({ location: { pathname, search } }) => {
      const route = this.resolve(pathname);
      if (route === undefined) {
        return this.#onError?.(new NotFoundResponse(pathname));
      }

      const context = { params: {}, query: {} };

      // ### Params
      // If the route has params we want to coerce the values to the expected types.

      if (route.params !== undefined) {
        const result = await route.params.spa(route.getParams(pathname));
        if (result.success === false) {
          return this.#onError?.(new BadRequestResponse("Invalid Params", result.error.flatten().fieldErrors));
        }
        context.params = result.data;
      }

      // ### Query
      // If the route has a query schema we need to validate and parse the query.

      if (route.query !== undefined) {
        const result = await route.query.spa(searchToQuery(search));
        if (result.success === false) {
          return this.#onError?.(new BadRequestResponse("Invalid Query", result.error.flatten().fieldErrors));
        }
        context.query = result.data;
      }

      // ### Actions

      for (const action of route.actions ?? []) {
        await action(context).catch(this.#onError);
      }

      this.#onRender?.(await route.handle(context), context);
    });

    // ### Initial Route
    // The initial route is resolved on the first call to `listen` so that
    // the router can initialize and render the current location state.

    if (initHistory === true) {
      const { pathname, search } = this.history.location;
      this.goto(pathname, search ? searchToQuery(search) : undefined);
    }

    return this;
  }

  /*
   |--------------------------------------------------------------------------------
   | Actions
   |--------------------------------------------------------------------------------
   */

  /**
   * Push a new routing request into the history instance triggering a new routing
   * transition.
   *
   * @param path  - Path to resolve.
   * @param state - State to pass.
   */
  goto(pathname: string, query?: Record<string, unknown>, state: Record<string, unknown> = {}): this {
    this.history.push(
      {
        pathname,
        search: query ? queryToSearch(query) : "",
      },
      state,
    );
    return this;
  }

  /**
   * Trigger a re-direct action to an internal or external endpoint.
   *
   * @param path       - Path to redirect to.
   * @param search     - Search parameters to add to the url.
   * @param isExternal - Go to a new window location or use internal router.
   */
  redirect(path: string, search?: Record<string, unknown>, isExternal = false): this {
    if (isExternal === true) {
      window.location.replace(path);
    } else {
      this.goto(path, search, { origin: this.history.location });
    }
    return this;
  }

  /**
   * Move browser history one step forwards, if there is no history item in the
   * forward direction this action does nothing.
   */
  forward = (): this => {
    this.history.forward();
    return this;
  };

  /**
   * Move browser history one step back, if there is no history item in the back
   * direction this action does nothing.
   */
  back = (): this => {
    this.history.back();
    return this;
  };

  /**
   * Reload the current route by re-executing the request.
   */
  reload(): this {
    this.history.replace(
      {
        pathname: this.history.location.pathname,
        search: this.history.location.search,
      },
      this.history.location.state,
    );
    return this;
  }

  /*
   |--------------------------------------------------------------------------------
   | Helpers
   |--------------------------------------------------------------------------------
   */

  resolve(path: string): AnyRoute | undefined {
    for (const route of this.routes) {
      if (route.test(path) === true) {
        return route;
      }
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Helpers
 |--------------------------------------------------------------------------------
 */

/**
 * Sorting method for routes to ensure that static properties takes precedence
 * for when a route is matched against incoming requests.
 *
 * @param a - Route A
 * @param b - Route B
 */
function byStaticPriority(a: AnyRoute, b: AnyRoute) {
  const aSegments = a.path.split("/");
  const bSegments = b.path.split("/");

  const maxLength = Math.max(aSegments.length, bSegments.length);

  for (let i = 0; i < maxLength; i++) {
    const aSegment = aSegments[i] || "";
    const bSegment = bSegments[i] || "";

    const isADynamic = aSegment.startsWith(":");
    const isBDynamic = bSegment.startsWith(":");

    if (isADynamic !== isBDynamic) {
      return isADynamic ? 1 : -1;
    }

    if (isADynamic === false && aSegment !== bSegment) {
      return aSegment.localeCompare(bSegment);
    }
  }

  return a.path.localeCompare(b.path);
}

function queryToSearch(query: Record<string, unknown>): string {
  return Object.keys(query)
    .map((key) => `${key}=${query[key]}`)
    .join("&");
}

function searchToQuery(search: string): Record<string, unknown> {
  return search.split("&").reduce((query: Record<string, unknown>, entry) => {
    const [key, value] = entry.split("=");
    query[key] = value;
    return query;
  }, {});
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type InferRouteContext<TRouter extends Router, TPath extends TRouter["routes"][number]["path"]> = Exclude<
  Extract<TRouter["routes"][number], { path: TPath }>["$inferContext"],
  { params: any; query: any }
>;

type OnRenderHandler = (
  components: unknown,
  props: {
    params: Record<string, unknown>;
    query: Record<string, unknown>;
  },
) => void;

type OnErrorHandler = (
  error:
    | RouteResponse
    | BadRequestResponse
    | UnauthorizedResponse
    | ForbiddenResponse
    | NotFoundResponse
    | InternalServiceError,
) => void;
