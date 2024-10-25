import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import psql, { type Sql } from "postgres";

import { Database } from "../database.ts";

export class PostgresDatabase<TSchema extends Record<string, unknown>> extends Database<Sql, PostgresJsDatabase<TSchema>> {
  #instance?: PostgresJsDatabase<TSchema>;

  constructor(readonly conn: PostgresConnection, readonly schema: TSchema) {
    super();
  }

  override get client(): Sql {
    if (typeof this.conn === "string") {
      return psql(this.conn);
    }
    if ("CLOSE" in this.conn) {
      return this.conn;
    }
    return this.conn();
  }

  override get drizzle(): PostgresJsDatabase<TSchema> {
    if (this.#instance === undefined) {
      this.#instance = drizzle(this.client, { schema: this.schema });
    }
    return this.#instance;
  }
}

export type PostgresConnection = PostgresConnectionUrl | Sql | (() => Sql);

export type PostgresConnectionUrl = `postgres://${string}:${string}@${string}:${number}/${string}`;
