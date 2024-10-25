import { ensureFile } from "@std/fs";
import { format } from "prettier";

import type { Method } from "../libraries/method.ts";
import { resolveMethods } from "./methods.ts";
import { resolveNamespacedTypes } from "./types.ts";

export async function printApi(outputPaths: string[], methods: Method[]) {
  const content = new TextEncoder().encode(
    await format(
      `
        import type { ErrorResponse, Notification, Request, SuccessResponse } from "@valkyr/json-rpc";

        export class Api {
          readonly #config: Config;

          #id: number = 0;

          /**
           * Instantiate a new API instance.
           * 
           * @params config - Instance configuration object.
           */
          constructor(config: Config) {
            this.#config = config;
          }

          ${resolveMethods(methods).join("\n\n")}

          /**
           * Send a JSON-RPC 2.0 request to the server.
           *
           * @param method - Method to execute on the server.
           * @param params - Parameters to send with the request.
           * @param id     - JSON-RPC 2.0 ID. (Optional)
           */
          async #request<TResponse>(message: Omit<Request<any> | Notification<any>, "jsonrpc">): Promise<TResponse> {
            const response = await this.#config.send({ jsonrpc: "2.0", ...message });
            if ("id" in message === false) {
              return undefined as TResponse;
            }
            if (response === undefined) {
              throw new Error("JSON-RPC 2.0 Request missing expected response object");
            }
            if ("error" in response) {
              throw response.error;
            }
            return response.result as TResponse;
          }

          #getId(): number {
            return this.#id++;
          }
        }

        type Config = {
          send: (payload: Request<any> | Notification<any>) => Promise<SuccessResponse | ErrorResponse | undefined>;
        };

        ${resolveNamespacedTypes(methods)}
      `,
      {
        parser: "typescript",
        printWidth: 165,
      },
    ),
  );
  for (const outputPath of outputPaths) {
    await ensureFile(outputPath);
    await Deno.writeFile(
      outputPath,
      content,
      {
        create: true,
      },
    );
  }
}
