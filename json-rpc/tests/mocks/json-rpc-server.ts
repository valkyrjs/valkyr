import {
  type ErrorResponse,
  InternalError,
  MethodNotFoundError,
  type Notification,
  type Params,
  type Request,
  RpcError,
  type SuccessResponse,
} from "../../mod.ts";

export class JsonRpcServer {
  readonly #methods = new Map<string, (...args: any) => Promise<any>>(
    [
      [
        "subtract.positional",
        async ([a, b]) => {
          return a - b;
        },
      ],
      [
        "subtract.named",
        async ({ subtrahend, minuend }) => {
          return subtrahend - minuend;
        },
      ],
      ["update", async () => {}],
    ],
  );

  async handle(request: Request<Params> | Notification<Params>): Promise<SuccessResponse | ErrorResponse | undefined> {
    const handler = this.#methods.get(request.method);
    if (handler === undefined) {
      return {
        jsonrpc: "2.0",
        error: new MethodNotFoundError({ method: request.method }),
        id: (request as any).id ?? null,
      };
    }

    if ("id" in request) {
      let result: any;
      try {
        result = {
          jsonrpc: "2.0",
          result: await handler(request.params),
          id: request.id,
        };
      } catch (error) {
        console.log(error);
        result = {
          jsonrpc: "2.0",
          error: error instanceof RpcError ? error : new InternalError(),
          id: request.id,
        };
      }
      return result;
    }

    handler(request.params);
  }
}
