import { NEW_LINE, PROTOCOL } from "./common.ts";
import { Response } from "./response.ts";

export class Request {
  constructor(readonly connection: Deno.Conn, readonly options: RequestOptions) {}

  async send(): Promise<Response> {
    const http = await this.encode(this.toHttp());
    await this.connection.write(http);
    return new Response(this.connection).resolve();
  }

  toHttp() {
    const { method, path, headers = {}, body } = this.options;
    const parts: string[] = [
      `${method} ${path} ${PROTOCOL}`,
    ];
    for (const key in headers) {
      parts.push(`${key}: ${(headers as any)[key]}`);
    }
    if (body !== undefined) {
      parts.push(`Content-Length: ${body.length}`);
    }
    return `${parts.join(NEW_LINE)}${NEW_LINE}${NEW_LINE}${body ?? ""}`;
  }

  async encode(value: string): Promise<Uint8Array> {
    return new TextEncoder().encode(value);
  }

  async decode(buffer: Uint8Array): Promise<string> {
    return new TextDecoder().decode(buffer);
  }
}

export type RequestOptions = {
  method: RequestMethod;
  path: string;
  headers?: RequestInit["headers"];
  body?: string;
};

export type RequestMethod = "HEAD" | "OPTIONS" | "POST" | "GET" | "PUT" | "DELETE";
