import type { RpcError } from "~libraries/errors.ts";

import type { Id } from "./common.ts";

export type Response = {
  /**
   * A String specifying the version of the JSON-RPC protocol. MUST be exactly "2.0".
   */
  jsonrpc: "2.0";

  /**
   * It MUST be the same as the value of the id member in the Request Object. If
   * there was an error in detecting the id in the Request object (e.g. Parse
   * error/Invalid Request), it MUST be Null.
   */
  id: Id;
};

/**
 * JSON-RPC 2.0 compliant success response.
 */
export type SuccessResponse<Result = void> = Response & {
  result: Result;
};

/**
 * JSON-RPC 2.0 compliant error response.
 */
export type ErrorResponse = Response & {
  error: RpcError;
};
