/**
 * Database that can be provided to a variety of drizzle adapters to data providers.
 *
 * Connection is provided through a lazy .getInstance hook that is requested on
 * runtime on the first query executed.
 *
 * @example
 * ```ts
 * // ...
 * ```
 */
export abstract class Database<TClient, TDrizzle extends Drizzle> {
  /**
   * Raw database client.
   */
  abstract get client(): TClient;

  /**
   * Drizzle wrapper for the database client.
   */
  abstract get drizzle(): TDrizzle;

  /**
   * {@link https://orm.drizzle.team/docs/rqb}
   */
  get query() {
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
 | Types
 |--------------------------------------------------------------------------------
 */

type Drizzle = {
  query: any;
  transaction: any;
  insert: any;
  select: any;
  update: any;
  delete: any;
};
