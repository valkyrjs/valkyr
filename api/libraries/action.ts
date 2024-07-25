import type { RpcError } from "@valkyr/json-rpc";

/*
 |--------------------------------------------------------------------------------
 | Response
 |--------------------------------------------------------------------------------
 |
 | Simplify the response object by providing a function to create the response
 | format returned as part of request actions.
 |
 */

export const response: ActionResponse = {
  accept(params = {}) {
    return {
      status: "accept",
      params,
    };
  },
  reject(error) {
    return {
      status: "reject",
      error,
    };
  },
} as const;

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type ActionResponse = {
  accept(params?: Record<string, unknown>): Accept;
  reject(error: RpcError): Reject;
};

/**
 * Actions can be added to the actions of a route allowing for middleware like
 * operations before the route handler is executed. An action return an object
 * which extends the incoming parameters with additional data.
 */
export type Action<P extends Record<string, unknown> = Empty> = (
  req: Partial<RequestContext>,
  res: Response<P>,
) => Promise<Accept<P> | Reject> | (Accept<P> | Reject);

/**
 * Request context is passed into every method allowing external implementation
 * to pass in shared context functionality and values.
 */
export type RequestContext = Record<string, unknown>;

type Response<P extends Record<string, unknown> = Empty> = P extends Empty ? {
    accept(): Accept;
    reject(error: RpcError): Reject;
  }
  : {
    accept(params: P): Accept<P>;
    reject(error: RpcError): Reject;
  };

type Accept<Params extends Record<string, unknown> = Record<string, unknown>> = {
  status: "accept";
  params: {
    [K in keyof Params]: Params[K];
  };
};

type Reject = {
  status: "reject";
  error: RpcError;
};

type Empty = Record<string, never>;
