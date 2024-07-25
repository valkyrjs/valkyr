import { Client, type Response } from "../../http/mod.ts";

class Modem {
  constructor(
    readonly options: Deno.ConnectOptions | Deno.UnixConnectOptions,
    readonly client: Client = new Client(options),
  ) {}

  /**
   * Send a `POST` request to the Docker API.
   *
   * @param param.path  - Path of the API endpoint.
   * @param param.query - Query parameters.
   * @param param.body  - Request body.
   */
  async post<T = Record<string, never>>({ path, query = {}, body }: RequestOptions): Promise<T> {
    return getParsedResponse<T>(await this.request({ method: "POST", path, query, body }));
  }

  /**
   * Send a `GET` request to the Docker API.
   *
   * @param param.path  - Path of the API endpoint.
   * @param param.query - Query parameters.
   */
  async get<T = Record<string, never>>({ path, query }: Omit<RequestOptions, "body">): Promise<T> {
    return getParsedResponse<T>(await this.request({ method: "GET", path, query }));
  }

  /**
   * Send a `DELETE` request to the Docker API.
   *
   * @param param.path  - Path of the API endpoint.
   * @param param.query - Query parameters.
   */
  async del<T = Record<string, never>>({ path, query }: Omit<RequestOptions, "body">): Promise<T> {
    return getParsedResponse<T>(await this.request({ method: "DELETE", path, query }));
  }

  /**
   * Send a fetch request to the Docker API.
   *
   * Note! When calling this method directly, ensure to call the .close() method on the response
   * or active connections may remain open causing dirty shutdown of services. Only when accessing
   * the .stream of the response through an async itterator is the connection automatically closed
   * when the itterator has completed.
   *
   * @param param.method  - HTTP method to use.
   * @param param.path    - Path of the API endpoint.
   * @param param.query   - Query parameters.
   * @param param.body    - Request body. _(Ignored for `GET` requests.)_
   * @param param.headers - Headers to send with the request.
   */
  async request(
    { method, path, query = {}, body, headers = {} }: { method: "POST" | "GET" | "DELETE" } & RequestOptions,
  ): Promise<Response> {
    return this.client.fetch(`http://docker${path}${toSearchParams(query)}`, {
      method,
      body,
      headers,
    });
  }
}

export const modem: Modem = new Modem({
  path: "/var/run/docker.sock",
  transport: "unix",
});

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function getParsedResponse<T>(res: Response): T {
  res.close();
  if (res.status >= 400) {
    const error = res.json;
    assertError(error);
    throw new Error(error.message);
  }
  if (res.status === 204 || res.status === 304) {
    return {} as T;
  }
  return res.json as T;
}

function toSearchParams(query: Record<string, unknown>): string {
  if (Object.keys(query).length === 0) {
    return "";
  }
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    searchParams.append(key, String(value));
  }
  return `?${searchParams.toString()}`;
}

function assertError(error: unknown): asserts error is { message: string } {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    throw new Error("Docker Modem > Could not parse error response.");
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type RequestOptions = {
  path: string;
  headers?: RequestInit["headers"];
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
};
