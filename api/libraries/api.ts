import {
  assertJsonRpcRequest,
  type ErrorResponse,
  InternalError,
  InvalidParamsError,
  MethodNotFoundError,
  type RequestCandidate,
  RpcError,
  type SuccessResponse,
} from "@valkyr/json-rpc";

import { type RequestContext, response } from "./action.ts";
import type { Method } from "./method.ts";

export class Api<TContext extends RequestContext = RequestContext> {
  readonly #methods = new Map<string, Method<TContext>>();

  readonly #options: Options;

  constructor(options: Options = {}) {
    this.#options = options;
  }

  /**
   * List of registered API methods in the form of `[name, method]` tuples.
   */
  get methods(): [string, Method<TContext>][] {
    return Array.from(this.#methods.entries());
  }

  /*
   |--------------------------------------------------------------------------------
   | Registrars
   |--------------------------------------------------------------------------------
   */

  /**
   * Register a method to the API instance.
   *
   * @param method - Method instance.
   */
  register(method: Method<TContext>): void {
    this.#methods.set(method.method, method);
  }

  /*
   |--------------------------------------------------------------------------------
   | Method Handlers
   |--------------------------------------------------------------------------------
   */

  /**
   * Handle JSON RPC request and return a result. When a Notification is provided
   * the result will be `undefined`.
   *
   * @param request - JSON RPC request or notification.
   * @param context - Request context to be passed to the method handler.
   */
  async handle(
    request: RequestCandidate,
    context: TContext,
  ): Promise<SuccessResponse | ErrorResponse | undefined> {
    try {
      assertJsonRpcRequest(request);
    } catch (error) {
      return {
        jsonrpc: "2.0",
        error: error instanceof RpcError ? error : new InternalError(),
        id: null,
      };
    }

    // ### Retrieve Method

    const method = this.#methods.get(request.method);
    if (method === undefined) {
      return {
        jsonrpc: "2.0",
        error: new MethodNotFoundError({ method: request.method }),
        id: (request as any).id ?? null,
      };
    }

    // ### Validate Parameters

    const params = request.params ?? {};

    if (method.params !== undefined) {
      const result = await method.params.spa(params);
      if (result.success === false) {
        return {
          jsonrpc: "2.0",
          error: new InvalidParamsError(result.error.flatten().fieldErrors),
          id: (request as any).id ?? null,
        };
      }
    }

    // ### Run Actions

    for (const action of method.actions ?? []) {
      const result = await (action as any)(context, response);
      if (result.status === "reject") {
        return {
          jsonrpc: "2.0",
          error: result.error,
          id: (request as any).id ?? null,
        };
      }
      for (const key in result.params) {
        (request.params as any)[key] = result.params[key];
      }
    }

    // ### Handle Request

    if ("id" in request) {
      let result: any;
      try {
        result = {
          jsonrpc: "2.0",
          result: await method.handler({ params, ...context }),
          id: request.id,
        };
      } catch (error) {
        this.#options.onError?.(error);
        result = {
          jsonrpc: "2.0",
          error: error instanceof RpcError ? error : new InternalError(),
          id: request.id,
        };
      }
      return result;
    }

    method?.handler({ params, ...context });
  }
}

type Options = {
  onError?: (error: unknown) => void;
};
