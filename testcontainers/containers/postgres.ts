/**
 * @module
 *
 * Provides the ability to quickly run a postgres image in a docker instance.
 *
 * @example
 * ```ts
 * import { PostgresTestContainer } from "@valkyr/testcontainers/postgres";
 *
 * const container = await PostgresTestContainer.start("postgres:16");
 *
 * await container.create("db");
 * await container.client("db")`SELECT 1`;
 *
 * console.log(container.url("db")); // => postgres://postgres:postgres@127.0.0.1:5432/db
 *
 * await container.stop();
 * ```
 */

import { delay } from "@std/async/delay";
import { getAvailablePort } from "@std/net";
import psql, { type Sql } from "postgres";

import type { Container } from "../docker/libraries/container.ts";
import { docker } from "../mod.ts";

/**
 * Provides a simplified utility layer for starting, operating, and shutting down a
 * postgres docker container.
 *
 * Will automatically pull the requested docker image before starting the container.
 */
export class PostgresTestContainer {
  readonly #connection: PostgresConnectionInfo;

  private constructor(
    readonly container: Container,
    connection: PostgresConnectionInfo,
  ) {
    this.#connection = connection;
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  /**
   * PostgreSQL container host.
   */
  get host(): string {
    return this.#connection.host;
  }

  /**
   * PostgreSQL container port.
   */
  get port(): number {
    return this.#connection.port;
  }

  /**
   * PostgreSQL username applied to the container.
   */
  get username(): string {
    return this.#connection.user;
  }

  /**
   * PostgreSQL password applied to the container.
   */
  get password(): string {
    return this.#connection.pass;
  }

  /**
   * Execute a command in the Postgres container.
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
   * Start a new Postgres container.
   *
   * @param config - Options for the Postgres container.
   */
  static async start(image: string, config: Partial<PostgresConnectionInfo> = {}): Promise<PostgresTestContainer> {
    const port = getAvailablePort({ preferredPort: config.port });
    if (port === undefined) {
      throw new Error("Unable to assign to a random port");
    }

    await docker.pullImage(image);

    const container = await docker.createContainer({
      Image: image,
      Env: [`POSTGRES_USER=${config.user ?? "postgres"}`, `POSTGRES_PASSWORD=${config.pass ?? "postgres"}`],
      ExposedPorts: {
        "5432/tcp": {},
      },
      HostConfig: {
        PortBindings: { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: String(port) }] },
      },
    });

    await container.start();
    await container.waitForLog("database system is ready");

    await delay(250);

    return new PostgresTestContainer(container, {
      host: config.host ?? "127.0.0.1",
      port,
      user: config.user ?? "postgres",
      pass: config.pass ?? "postgres",
    });
  }

  /**
   * Stop and remove the Postgres container.
   */
  async stop(): Promise<void> {
    await this.container.remove({ force: true });
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  /**
   * Create a new database with the given name.
   *
   * @param name - Name of the database to create.
   */
  async create(name: string): Promise<void> {
    await this.exec(["createdb", `--username=${this.username}`, name]);
  }

  /**
   * Get postgres client instance for the current container.
   *
   * @param name    - Database name to connect to.
   * @param options - Connection options to append to the URL.
   */
  client(name: string, options?: PostgresConnectionOptions): Sql {
    return psql(this.url(name, options));
  }

  /**
   * Return the connection URL for the Postgres container in the format:
   * `postgres://${user}:${pass}@${host}:${port}/${database}`.
   *
   * Make sure to start the container before accessing this method or it will
   * throw an error.
   *
   * @param name    - Name of the database to connect to.
   * @param options - Connection options to append to the URL.
   */
  url(name: string, options?: PostgresConnectionOptions): PostgresConnectionUrl {
    return `postgres://${this.username}:${this.password}@${this.host}:${this.port}/${name}${
      postgresOptionsToString(options)
    }`;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function postgresOptionsToString(options?: PostgresConnectionOptions) {
  if (options === undefined) {
    return "";
  }
  const values: string[] = [];
  for (const key in options) {
    assertPostgresOptionKey(key);
    values.push(`${key}=${options[key]}`);
  }
  return `?${values.join("&")}`;
}

function assertPostgresOptionKey(key: string): asserts key is keyof PostgresConnectionOptions {
  if (["schema"].includes(key) === false) {
    throw new Error(`Invalid postgres option key: ${key}`);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type PostgresConnectionUrl = `postgres://${string}:${string}@${string}:${number}/${string}`;

type PostgresConnectionOptions = {
  schema?: string;
};

type PostgresConnectionInfo = {
  user: string;
  pass: string;
  host: string;
  port: number;
};
