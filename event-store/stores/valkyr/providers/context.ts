import type { Collection } from "@valkyr/db";

import type { Context as Operation } from "~types/context.ts";

import type { Context } from "../database.ts";

export class ContextProvider {
  constructor(readonly contexts: Collection<Context>) {}

  /**
   * Handle incoming context operations.
   *
   * @param contexts - List of context operations to execute.
   */
  async handle(contexts: Operation[]): Promise<void> {
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
    await this.contexts.insertOne({ key, stream });
  }

  /**
   * Batch insert a large amount of event contexts.
   *
   * @param contexts  - Contexts to insert.
   * @param batchSize - Batch size for the insert loop.
   */
  async insertBatch(contexts: { key: string; stream: string }[], batchSize: number = 1_000): Promise<void> {
    for (let i = 0; i < contexts.length; i += batchSize) {
      await this.contexts.insertMany(contexts.slice(i, i + batchSize));
    }
  }

  /**
   * Get a list of event streams registered under the given context key.
   *
   * @param key - Context key to get event streams for.
   */
  async getByKey(key: string): Promise<Context[]> {
    return this.contexts.find({ key });
  }

  /**
   * Removes a stream form a context.
   *
   * @param key    - Context key to remove stream from.
   * @param stream - Stream to remove from context.
   */
  async remove(key: string, stream: string): Promise<void> {
    await this.contexts.remove({ key, stream });
  }
}
