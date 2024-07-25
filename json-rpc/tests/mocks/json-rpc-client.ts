import { InternalError, type Params } from "../../mod.ts";
import { JsonRpcServer } from "./json-rpc-server.ts";

export class JsonRpcClient {
  readonly #server = new JsonRpcServer();

  async subtractPositional(a: number, b: number): Promise<number> {
    return this.#send("subtract.positional", [a, b]);
  }

  async subtractNamed(subtrahend: number, minuend: number): Promise<number> {
    return this.#send("subtract.named", { subtrahend, minuend });
  }

  async update(a: number[]): Promise<void> {
    await this.#notify("update", a);
  }

  async foobar(): Promise<void> {
    await this.#send("foobar");
  }

  async #notify(method: string, params?: Params): Promise<void> {
    await this.#server.handle({ jsonrpc: "2.0", method, params });
  }

  async #send(method: string, params?: Params): Promise<any> {
    const response = await this.#server.handle({ jsonrpc: "2.0", method, params, id: "test" });
    if (response === undefined) {
      throw new InternalError("Request returned unrecognized response");
    }
    if ("error" in response) {
      throw new Error(response.error.message);
    }
    return response.result;
  }
}
