import { and, eq, or } from "drizzle-orm";

import type { Context, ContextPayload } from "~types/context.ts";

import type { PostgresDatabase, Transaction as PGTransaction } from "../database.ts";
import type { PGContextTable } from "../schemas/contexts.ts";

export class ContextProvider {
  constructor(readonly db: PostgresDatabase | PGTransaction, readonly schema: PGContextTable) {}

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
   * Batch insert a large amount of event contexts.
   *
   * @param contexts  - Contexts to insert.
   * @param batchSize - Batch size for the insert loop.
   */
  async insertBatch(contexts: ContextPayload[], batchSize: number = 1_000): Promise<void> {
    for (let i = 0; i < contexts.length; i += batchSize) {
      await this.db.insert(this.schema).values(contexts.slice(i, i + batchSize));
    }
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

  /**
   * Removes a stream form.
   *
   * @param contexts  - Contexts to remove stream from.
   * @param batchSize - Batch size for the insert loop.
   */
  async removeBatch(contexts: ContextPayload[], batchSize: number = 1_000): Promise<void> {
    if (this.schema.key.columnType === "SQLiteText" as any) {
      batchSize = 500;
    }
    for (let i = 0; i < contexts.length; i += batchSize) {
      await this.db.delete(this.schema).where(
        or(...contexts.slice(i, i + batchSize).map((context) => and(eq(this.schema.key, context.key), eq(this.schema.stream, context.stream)))),
      );
    }
  }
}
