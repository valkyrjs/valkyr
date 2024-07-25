import type { Database } from "@valkyr/drizzle";
import { and, eq } from "drizzle-orm";

import type { Context } from "~types/context.ts";

import type { EventStoreDB } from "../database.ts";
import { contexts as schema } from "./schema.ts";

export class ContextProvider {
  constructor(readonly db: Database<EventStoreDB>) {}

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
    await this.db.insert(schema).values({ key, stream });
  }

  /**
   * Get a list of event streams registered under the given context key.
   *
   * @param key - Context key to get event streams for.
   */
  async getByKey(key: string): Promise<{ stream: string; key: string }[]> {
    return this.db.select().from(schema).where(eq(schema.key, key));
  }

  /**
   * Removes a stream form a context.
   *
   * @param key    - Context key to remove stream from.
   * @param stream - Stream to remove from context.
   */
  async remove(key: string, stream: string): Promise<void> {
    await this.db.delete(schema).where(and(eq(schema.key, key), eq(schema.stream, stream)));
  }
}
