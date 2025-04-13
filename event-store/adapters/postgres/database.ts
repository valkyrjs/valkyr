import postgres, { type Sql } from "postgres";

import { PostgresConnection } from "./connection.ts";

export class PostgresDatabase {
  readonly #connection: PostgresConnection;

  #sql?: Sql;

  constructor(connection: PostgresConnection) {
    this.#connection = connection;
  }

  get sql(): Sql {
    if (this.#sql === undefined) {
      const connection = this.#connection;
      if (Array.isArray(connection)) {
        const [urlOrOptions, option] = connection;
        if (typeof urlOrOptions === "string") {
          this.#sql = postgres(urlOrOptions, option);
        } else {
          this.#sql = postgres(urlOrOptions);
        }
      } else if ("options" in connection) {
        this.#sql = connection;
      } else {
        this.#sql = connection();
      }
    }
    return this.#sql;
  }
}

export type DatabaseAccessor = {
  sql: Sql;
};
