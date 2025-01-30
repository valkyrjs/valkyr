/**
 * @module
 *
 * Provides the ability to quickly run a mongo image in a docker instance.
 *
 * @example
 * ```ts
 * import { MongoTestContainer } from "@valkyr/testcontainers/mongo";
 *
 * const container = await MongoTestContainer.start("mongo");
 *
 * console.log(container.client()); // => MongoClient
 * console.log(container.url());    // => mongodb://user:password@127.0.0.1:27017
 *
 * await container.stop();
 * ```
 */

import { delay } from "@std/async/delay";
import { getAvailablePort } from "@std/net";
import { MongoClient, type MongoClientOptions } from "mongodb";

import type { Container } from "../docker/libraries/container.ts";
import { docker } from "../mod.ts";

/**
 * Provides a simplified utility layer for starting, operating, and shutting down a
 * postgres docker container.
 *
 * Will automatically pull the requested docker image before starting the container.
 */
export class MongoTestContainer {
  readonly #connection: MongoConnectionInfo;

  #client?: MongoClient;

  private constructor(
    readonly container: Container,
    connection: MongoConnectionInfo,
  ) {
    this.#connection = connection;
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get client(): MongoClient {
    if (this.#client === undefined) {
      this.#client = new MongoClient(this.url(), this.#connection.opts);
    }
    return this.#client;
  }

  /**
   * MongoDb container host.
   */
  get host(): string {
    return this.#connection.host;
  }

  /**
   * MongoDb container port.
   */
  get port(): number {
    return this.#connection.port;
  }

  /**
   * MongoDb username applied to the container.
   */
  get username(): string {
    return this.#connection.user;
  }

  /**
   * MongoDb password applied to the container.
   */
  get password(): string {
    return this.#connection.pass;
  }

  /**
   * Execute a command in the Mongo container.
   */
  get exec(): typeof this.container.exec {
    return this.container.exec.bind(this.container);
  }

  /*
   |--------------------------------------------------------------------------------
   | Lifecycle
   |--------------------------------------------------------------------------------
   */

  /**
   * Start a new Mongo container.
   *
   * @param image  - Which docker image to run.
   * @param config - Configuration for the Mongo container.
   */
  static async start(image: string = "mongo:8.0.3", config: Partial<MongoConnectionInfo> = {}): Promise<MongoTestContainer> {
    const port = getAvailablePort({ preferredPort: config.port });
    if (port === undefined) {
      throw new Error("Unable to assign to a random port");
    }

    await docker.pullImage(image);

    const container = await docker.createContainer({
      Image: image,
      Env: [`MONGO_INITDB_ROOT_USERNAME=${config.user ?? "root"}`, `MONGO_INITDB_ROOT_PASSWORD=${config.pass ?? "password"}`],
      ExposedPorts: {
        "27017/tcp": {},
      },
      HostConfig: {
        PortBindings: { "27017/tcp": [{ HostIp: "0.0.0.0", HostPort: String(port) }] },
      },
    });

    await container.start();
    await container.waitForLog("ready for start up");

    await delay(250);

    return new MongoTestContainer(container, {
      host: config.host ?? "127.0.0.1",
      port,
      user: config.user ?? "root",
      pass: config.pass ?? "password",
      opts: config.opts,
    });
  }

  /**
   * Stop and remove the Mongo container.
   */
  async stop(): Promise<void> {
    await this.client.close();
    await this.container.remove({ force: true });
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  /**
   * Return the connection URL for the Mongo container in the format:
   * `mongodb://${user}:${pass}@${host}:${port}`.
   *
   * Make sure to start the container before accessing this method or it will
   * throw an error.
   */
  url(): MongoConnectionUrl {
    return `mongodb://${this.username}:${this.password}@${this.host}:${this.port}`;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type MongoConnectionUrl = `mongodb://${string}:${string}@${string}:${number}`;

export type MongoConnectionInfo = {
  host: string;
  port: number;
  user: string;
  pass: string;
  opts?: MongoClientOptions;
};
