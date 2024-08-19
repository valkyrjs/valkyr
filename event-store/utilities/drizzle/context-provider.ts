import type { Database } from "@valkyr/toolkit/drizzle";
import { and, eq } from "drizzle-orm";

import type { PGContextTable } from "~stores/pg/contexts.ts";
import type { EventStoreDB as PGEventStoreDB, Transaction as PGTransaction } from "~stores/pg/database.ts";
import type { SQLiteContextTable } from "~stores/sqlite/contexts.ts";
import type { EventStoreDB as SQLiteEventStoreDB, Transaction as SQLiteTransaction } from "~stores/sqlite/database.ts";
import type { Context } from "~types/context.ts";

export class ContextProvider {
  readonly db: Database<PGEventStoreDB>;
  readonly schema: PGContextTable;

  constructor(db: Database<PGEventStoreDB> | PGTransaction, schema: PGContextTable);
  constructor(db: Database<SQLiteEventStoreDB> | SQLiteTransaction, schema: SQLiteContextTable);
  constructor(db: any, schema: any) {
    this.db = db;
    this.schema = schema;
  }

  /**
   * Handle incoming context operations.
   *
   * @param contexts - List of context operations to execute.
   */
  async handle(contexts: Context[]): Promise<void> {
    for (const context of contexts) {
      if (context.op === "insert") {
        await this.insert(context.key, context.stream);
      }
      if (context.op === "remove") {
        await this.remove(context.key, context.stream);
      }
    }
  }

  /**
   * Add stream to a context.
   *
   * @param key    - Context key to add stream to.
   * @param stream - Stream to add to the context.
   */
  async insert(key: string, stream: string): Promise<void> {
    await this.db.insert(this.schema).values({ key, stream });
  }

  /**
   * Get a list of event streams registered under the given context key.
   *
   * @param key - Context key to get event streams for.
   */
  async getByKey(key: string): Promise<{ stream: string; key: string }[]> {
    return this.db.select().from(this.schema).where(eq(this.schema.key, key));
  }

  /**
   * Removes a stream form a context.
   *
   * @param key    - Context key to remove stream from.
   * @param stream - Stream to remove from context.
   */
  async remove(key: string, stream: string): Promise<void> {
    await this.db.delete(this.schema).where(and(eq(this.schema.key, key), eq(this.schema.stream, stream)));
  }
}
