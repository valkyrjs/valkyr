import { PROTOCOL } from "./common.ts";

export class Response {
  status: number = 500;
  headers: Map<string, string> = new Map<string, string>();
  body = "";

  constructor(readonly connection: Deno.Conn) {}

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  /**
   * ReadableStream of the HTTP response.
   */
  get stream(): ReadableStream<string> {
    let isCancelled = false;
    return new ReadableStream({
      start: (controller) => {
        const push = () => {
          this.#readLine().then((line) => {
            const size = parseInt(line, 16);
            if (size === 0 || isCancelled === true) {
              if (size === 0 && isCancelled === false) {
                controller.close();
              }
              return this.connection.close();
            }
            controller.enqueue(line);
            push();
          });
        };
        push();
      },
      cancel: () => {
        isCancelled = true;
      },
    });
  }

  /**
   * Parsed JSON instance of the response body.
   */
  get json(): Record<string, unknown> {
    if (this.body === "") {
      return {};
    }
    return JSON.parse(this.body);
  }

  /*
   |--------------------------------------------------------------------------------
   | Resolver
   |--------------------------------------------------------------------------------
   */

  /**
   * Resolve the current response by reading the connection buffer and extracting
   * the head, headers and body.
   */
  async resolve(): Promise<this> {
    await this.#readHead();
    await this.#readHeader();
    if (this.headers.get("Content-Type") === "application/json") {
      await this.#readBody();
    }
    return this;
  }

  async #readHead() {
    const [protocol, statusCode] = await this.#readLine().then((head) => head.split(" "));
    if (protocol !== PROTOCOL) {
      throw new Error(`HttpResponse > Unknown protocol ${protocol} received.`);
    }
    this.status = parseInt(statusCode, 10);
  }

  async #readHeader() {
    const header = await this.#readLine();
    if (header === "") {
      return;
    }
    const [key, value] = header.split(":");
    this.headers.set(key.trim(), value.trim());
    await this.#readHeader();
  }

  async #readBody() {
    if (this.headers.get("Transfer-Encoding") === "chunked") {
      while (true) {
        const line = await this.#readLine();
        const size = parseInt(line, 16);
        if (size === 0) {
          return;
        }
        const buf = new ArrayBuffer(size);
        const arr = new Uint8Array(buf);
        await this.connection.read(arr);
        this.body += await this.#decode(arr);
      }
    } else if (this.headers.has("Content-Length") === true) {
      const size = parseInt(this.headers.get("Content-Length")!, 10);
      const buf = new ArrayBuffer(size);
      const arr = new Uint8Array(buf);
      await this.connection.read(arr);
      this.body += await this.#decode(arr);
    }
  }

  async #readLine(): Promise<string> {
    let result = "";
    while (true) {
      const buffer = new Uint8Array(1);
      if (result.indexOf("\n") !== -1) {
        return result.slice(0, result.length - 2); // return the full line without the \n flag
      }
      await this.connection.read(buffer);
      result += await this.#decode(buffer);
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Lifecycle
   |--------------------------------------------------------------------------------
   */

  /**
   * Close the connection that was used to produce the current response instance.
   *
   * Note! If the response is not closed an active connection may remain open
   * causing unclean shutdown of processes.
   */
  close(): this {
    this.connection.close();
    return this;
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  async #decode(value: Uint8Array): Promise<string> {
    return new TextDecoder().decode(value);
  }
}
