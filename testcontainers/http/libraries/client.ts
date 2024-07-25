import { Request, type RequestMethod } from "./request.ts";
import type { Response } from "./response.ts";

export class Client {
  constructor(readonly options: Deno.ConnectOptions | Deno.UnixConnectOptions) {}

  /**
   * Connection instance to use for a new fetch operation.
   *
   * Note! A new connection is spawned for every fetch request and is only automatically
   * closed when accessing the .stream on the response. Otherwise a manual .close must
   * be executed on the response to ensure that the connection is cleaned up.
   */
  get connection(): Promise<Deno.UnixConn> | Promise<Deno.TcpConn> {
    if ("path" in this.options) {
      return Deno.connect(this.options);
    }
    return Deno.connect(this.options);
  }

  async fetch(path: string, { method, headers = {}, body }: RequestOptions): Promise<Response> {
    const url = new URL(path);
    return new Request(await this.connection, {
      method,
      path: url.pathname + url.search,
      headers: {
        Host: url.host,
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    }).send();
  }
}

type RequestOptions = {
  method: RequestMethod;
  headers?: RequestInit["headers"];
  body?: Record<string, unknown>;
};
