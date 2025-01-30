import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { nanoid } from "nanoid";
import psql, { type Sql } from "postgres";

export class PostgresDatabase<TSchema extends Record<string, unknown>, TDrizzle extends PostgresJsDatabase<TSchema> = PostgresJsDatabase<TSchema>> {
  #instance?: PostgresJsDatabase<TSchema>;

  constructor(readonly conn: PostgresConnection, readonly schema: TSchema) {}

  get client(): Sql {
    if (typeof this.conn === "string") {
      return psql(this.conn);
    }
    if ("CLOSE" in this.conn) {
      return this.conn;
    }
    return this.conn();
  }

  get drizzle(): PostgresJsDatabase<TSchema> {
    if (this.#instance === undefined) {
      this.#instance = drizzle(this.client, { schema: this.schema });
    }
    return this.#instance;
  }

  /**
   * {@link https://orm.drizzle.team/docs/rqb}
   */
  get query(): TDrizzle["query"] {
    return this.drizzle.query;
  }

  /**
   * {@link https://orm.drizzle.team/docs/transactions}
   */
  get transaction(): TDrizzle["transaction"] {
    return this.drizzle.transaction.bind(this.drizzle);
  }

  /**
   * {@link https://orm.drizzle.team/docs/insert}
   */
  get insert(): TDrizzle["insert"] {
    return this.drizzle.insert.bind(this.drizzle);
  }

  /**
   * {@link https://orm.drizzle.team/docs/select}
   */
  get select(): TDrizzle["select"] {
    return this.drizzle.select.bind(this.drizzle);
  }

  /**
   * {@link https://orm.drizzle.team/docs/select#distinct-select}
   */
  get selectDistinct(): TDrizzle["selectDistinct"] {
    return this.drizzle.selectDistinct.bind(this.drizzle);
  }

  /**
   * {@link https://orm.drizzle.team/docs/insert}
   */
  get update(): TDrizzle["update"] {
    return this.drizzle.update.bind(this.drizzle);
  }

  /**
   * {@link https://orm.drizzle.team/docs/delete}
   */
  get delete(): TDrizzle["delete"] {
    return this.drizzle.delete.bind(this.drizzle);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

/**
 * Generate a new nanoid.
 *
 * @param size - Size of the id. Default: 11
 */
export function makeId(size: number = 11): string {
  return nanoid(size);
}

/**
 * Take the first entity out of a drizzle-orm select result.
 *
 * @param rows - Resulting rows from a select query.
 */
export function takeOne<TSchema extends Record<string, unknown>>(
  rows: TSchema[],
): TSchema | undefined {
  return rows[0];
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type PostgresConnection = PostgresConnectionUrl | Sql | (() => Sql);

export type PostgresConnectionUrl = `postgres://${string}:${string}@${string}:${number}/${string}`;
