import type { Params } from "~types/common.ts";
import type { Notification } from "~types/notification.ts";
import type { Request, RequestCandidate } from "~types/request.ts";

import { InvalidRequestError, ParseError } from "./errors.ts";

/**
 * Takes a JSON-RPC 2.0 message string returns a request candidate
 * instance that can be further asserted.
 *
 * @param message - JSON-RPC 2.0 message string.
 */
export function toJsonRpc(message: string): RequestCandidate {
  try {
    return JSON.parse(message);
  } catch {
    throw new ParseError("Malformed json provided in message body");
  }
}

/**
 * Asserts a request candidate object and throw an error if the request
 * candidate does not comply with the JSON-RPC 2.0 standard.
 *
 * @param request - Request candidate object to assert.
 */
export function assertJsonRpcRequest(
  request: RequestCandidate,
): asserts request is Request<Params> | Notification<Params> {
  if (request.jsonrpc !== "2.0") {
    throw new InvalidRequestError({
      reason: "Malformed or missing 'jsonrpc' in request",
      expected: {
        jsonrpc: "2.0",
      },
      received: request,
    });
  }
  if (typeof request.method !== "string") {
    throw new InvalidRequestError({
      reason: "Malformed or missing 'method' in request",
      expected: {
        method: "typeof string",
      },
      received: request,
    });
  }
  if (request.params !== undefined && typeof request.params !== "object") {
    throw new InvalidRequestError({
      reason: "Malformed 'params' in request",
      expected: {
        id: "typeof object",
      },
      received: request,
    });
  }
  if (request.id !== undefined && typeof request.id !== "string" && typeof request.id !== "number") {
    throw new InvalidRequestError({
      reason: "Malformed 'id' in request",
      expected: {
        id: "typeof string | number",
      },
      received: request,
    });
  }
}
