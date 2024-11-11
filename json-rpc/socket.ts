/**
 * @module
 *
 * This module contains functionality to connect to a WebSocket endpoint and interact
 * with it using the JSON-RPC 2.0 protocol.
 *
 * @example
 * ```ts
 * import { Socket } from "@valkyr/json-rpc/socket";
 *
 * export const socket = new Socket("ws://localhost/socket", {
 *   isAuthenticated: true,
 *   token: "random_token"
 * });
 *
 * // ### Call
 * // Executes a JSON-RPC 2.0 method and receives a response.
 *
 * const response = await socket.call("rpc:method", { hello: "world" }, 1);
 * if ("error" in response) {
 *   // handle error ...
 * }
 *
 * // ### Notify
 * // Executes a JSON-RPC 2.0 method which does not return a response.
 *
 * await socket.notify("rpc:method", { hello: "world" });
 * ```
 */

import { EventEmitter } from "@valkyr/event-emitter";

import { isJsonRpcId } from "~libraries/utilities.ts";
import type { Id, Params } from "~types/common.ts";
import type { ErrorResponse, SuccessResponse } from "~types/response.ts";

const HEARTBEAT_INTERVAL = 1_000 * 10; // 10 seconds
const RECONNECT_INCREMENT = 1_250; // 1.25 seconds
const MAX_RECONNECT_DELAY = 1_000 * 30; // 30 seconds

export class Socket extends EventEmitter<"connected" | "disconnected" | string> {
  #ws?: WebSocket;
  #reconnectDelay = 0;
  #debounce: Debounce = {
    reconnect: undefined,
    heartbeat: undefined,
  };

  #messages = new Map<Id, MessagePromise>();
  #handlers = new Map<string, MessageHandler<any>>();

  constructor(
    readonly url: string,
    readonly session: { isAuthenticated: boolean; token?: string },
  ) {
    super();
    this.connect = this.connect.bind(this);
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  /**
   * Check if the ready state of the socket is open.
   */
  get isConnected(): boolean {
    return this.#ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get the socket instance. This throws an error if the socket is not connected.
   */
  get socket(): WebSocket {
    const ws = this.#ws;
    if (ws === undefined || this.isConnected === false) {
      throw new Error("Socket is not connected");
    }
    return ws;
  }

  /*
   |--------------------------------------------------------------------------------
   | Connect
   |--------------------------------------------------------------------------------
   */

  /**
   * Connect to the server using the socket instance url configuration. If the
   * provided session is authenticated, the token value is added to `?token` value
   * of the request url when establishing to the connection.
   */
  async connect() {
    if (this.isConnected) {
      return;
    }

    let url = this.url;
    if (this.session.isAuthenticated === true) {
      url += `?token=${this.session.token}`;
    }

    this.#ws = new WebSocket(url);
    this.#ws.onopen = this.#onOpen.bind(this);
    this.#ws.onerror = this.#onError.bind(this);
    this.#ws.onmessage = this.#onMessage.bind(this);
    this.#ws.onclose = this.#onClose.bind(this);

    await this.waitForConnection();
  }

  /**
   * Wait for the initial connection to be established. This is useful in top
   * level await environments where we want to hault the loading of subsequent
   * code until a connection has been established.
   */
  async waitForConnection() {
    if (this.isConnected) {
      return;
    }
    await new Promise<void>((resolve) => {
      if (this.isConnected) {
        resolve();
      } else {
        this.once("connected", resolve);
      }
    });
  }

  /**
   * Disconnect the socket with a 4000 CLOSED_BY_CLIENT code.
   */
  disconnect(): Socket {
    if (this.#ws) {
      this.#ws.close(4000, "CLOSED_BY_CLIENT");
    }
    return this;
  }

  /**
   * Reload the socket by disconnecting and reconnecting the socket. This is
   * usually performed when a new `session` needs to be established.
   */
  async reload() {
    await this.disconnect().connect();
  }

  /*
   |--------------------------------------------------------------------------------
   | Listeners
   |--------------------------------------------------------------------------------
   */

  #onOpen() {
    this.emit("connected");
    if (this.#debounce.heartbeat !== undefined) {
      clearInterval(this.#debounce.heartbeat);
    }
    this.#debounce.heartbeat = setInterval(() => {
      this.waitForConnection().then(() => {
        this.socket.send("ping");
      });
    }, HEARTBEAT_INTERVAL);
  }

  #onError(ev: Event) {
    console.error(JSON.stringify(ev));
  }

  #onMessage(msg: MessageEvent<string>) {
    const data = JSON.parse(msg.data);

    // ### Response
    // Check if the incoming message is a response to a previously sent request.

    const promise = this.#messages.get(data.id);
    if (promise !== undefined) {
      this.#messages.delete(data.id);
      promise.resolve(data);
    }

    // ### Request
    // Check if the incoming message is a request to a registered handler.

    const handler = this.#handlers.get(data.method);
    if (handler !== undefined) {
      handler(data.params);
    }
  }

  #onClose(ev: CloseEvent) {
    this.emit("disconnected");
    if (this.#debounce.heartbeat !== undefined) {
      clearInterval(this.#debounce.heartbeat);
    }
    if (ev.code !== 4000) {
      const reconnect = this.#debounce.reconnect;
      if (reconnect) {
        clearTimeout(reconnect);
      }
      this.#debounce.reconnect = setTimeout(
        this.connect,
        this.#reconnectDelay < MAX_RECONNECT_DELAY ? (this.#reconnectDelay += RECONNECT_INCREMENT) : MAX_RECONNECT_DELAY,
      );
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Handler
   |--------------------------------------------------------------------------------
   */

  /**
   * Handle a JSON-RPC 2.0 request coming from an external source.
   *
   * @param method  - Method to listen for.
   * @param handler - Handler to execute on incoming message.
   */
  handle<TParams extends Params>(method: string, handler: MessageHandler<TParams>) {
    this.#handlers.set(method, handler);
  }

  /*
   |--------------------------------------------------------------------------------
   | Requests
   |--------------------------------------------------------------------------------
   */

  /**
   * Send a JSON-RPC 2.0 notification to the server.
   *
   * @param method - Method to call.
   * @param params - JSON-RPC 2.0 parameters.
   */
  async notify(method: string, params?: Params): Promise<void> {
    await this.waitForConnection();
    this.socket.send(JSON.stringify({ jsonrpc: "2.0", method, params }));
  }

  /**
   * Send a JSON-RPC 2.0 request to the server.
   *
   * @param method - Method to call.
   * @param id     - Request ID to resolve on response.
   */
  async call<T>(method: string, id: Id): Promise<SuccessResponse<T> | ErrorResponse>;

  /**
   * Send a JSON-RPC 2.0 request to the server.
   *
   * @param method - Method to call.
   * @param params - Parameters to send with the request.
   */
  async call<T>(method: string, params: Params): Promise<SuccessResponse<T> | ErrorResponse>;

  /**
   * Send a JSON-RPC 2.0 request to the server.
   *
   * @param method - Method to call.
   * @param params - Parameters to send with the request.
   * @param id     - Request ID to resolve on response.
   */
  async call<T>(method: string, params: Params, id: Id): Promise<SuccessResponse<T> | ErrorResponse>;

  async call<T>(
    method: string,
    paramsOrId: Params | Id,
    id: Id = Math.floor(Math.random() * 100000),
  ): Promise<SuccessResponse<T> | ErrorResponse> {
    await this.waitForConnection();
    let params: Params = {};
    if (isJsonRpcId(paramsOrId)) {
      id = paramsOrId;
    } else {
      params = paramsOrId;
    }
    return this.#send<T>({ jsonrpc: "2.0", method, params, id }, id);
  }

  async #send<T>(payload: any, id: Id): Promise<SuccessResponse<T> | ErrorResponse> {
    return new Promise((resolve, reject) => {
      this.socket.send(JSON.stringify(payload));
      this.#messages.set(id, { resolve, reject });
    });
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type MessagePromise<T = any> = {
  resolve: (value: SuccessResponse<T> | ErrorResponse | PromiseLike<SuccessResponse<T> | ErrorResponse>) => void;
  reject: (reason?: string) => void;
};

type MessageHandler<TParams extends Params> = (params: TParams) => Promise<void> | void;

type Debounce = {
  reconnect: Timer | undefined;
  heartbeat: Timer | undefined;
};

type Timer = ReturnType<typeof setTimeout>;
