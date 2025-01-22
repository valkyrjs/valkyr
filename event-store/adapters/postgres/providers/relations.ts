import { and, eq, inArray, or } from "drizzle-orm";

import { RelationsProvider } from "~types/providers/relations.ts";
import type { Relation, RelationPayload } from "~types/relation.ts";

import type { PostgresDatabase, RelationsTable, Transaction as PGTransaction } from "../schema.ts";

export class PostgresRelationsProvider implements RelationsProvider {
  constructor(readonly db: PostgresDatabase | PGTransaction, readonly schema: RelationsTable) {}

  /**
   * Access drizzle query features for relations provider.
   */
  get query(): this["db"]["query"] {
    return this.db.query;
  }

  /**
   * Handle incoming relation operations.
   *
   * @param relations - List of relation operations to execute.
   */
  async handle(relations: Relation[]): Promise<void> {
    await Promise.all([
      this.insertMany(relations.filter((relation) => relation.op === "insert")),
      this.removeMany(relations.filter((relation) => relation.op === "remove")),
    ]);
  }

  /**
   * Add stream to the relations table.
   *
   * @param key    - Relational key to add stream to.
   * @param stream - Stream to add to the key.
   */
  async insert(key: string, stream: string): Promise<void> {
    await this.db.insert(this.schema).values({ key, stream });
  }

  /**
   * Add stream to many relational keys onto the relations table.
   *
   * @param relations - Relations to insert.
   * @param batchSize - Batch size for the insert loop.
   */
  async insertMany(relations: RelationPayload[], batchSize: number = 1_000): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < relations.length; i += batchSize) {
        await tx.insert(this.schema).values(relations.slice(i, i + batchSize)).onConflictDoNothing();
      }
    });
  }

  /**
   * Get a list of event streams registered under the given relational key.
   *
   * @param key - Relational key to get event streams for.
   */
  async getByKey(key: string): Promise<{ stream: string; key: string }[]> {
    return this.db.select({ key: this.schema.key, stream: this.schema.stream }).from(this.schema).where(eq(this.schema.key, key));
  }

  /**
   * Get a list of event streams registered under the given relational keys.
   *
   * @param keys - Relational keys to get event streams for.
   */
  async getByKeys(keys: string[]): Promise<string[]> {
    return this.db.selectDistinct({ stream: this.schema.stream }).from(this.schema).where(inArray(this.schema.key, keys)).then((rows) =>
      rows.map(({ stream }) => stream)
    );
  }

  /**
   * Removes a stream from the relational table.
   *
   * @param key    - Relational key to remove stream from.
   * @param stream - Stream to remove from relation.
   */
  async remove(key: string, stream: string): Promise<void> {
    await this.db.delete(this.schema).where(and(eq(this.schema.key, key), eq(this.schema.stream, stream)));
  }

  /**
   * Removes multiple relational entries.
   *
   * @param relations - Relations to remove stream from.
   * @param batchSize - Batch size for the insert loop.
   */
  async removeMany(relations: RelationPayload[], batchSize: number = 1_000): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < relations.length; i += batchSize) {
        await tx.delete(this.schema).where(
          or(...relations.slice(i, i + batchSize).map((relation) => and(eq(this.schema.key, relation.key), eq(this.schema.stream, relation.stream)))),
        );
      }
    });
  }

  /**
   * Remove all relations bound to the given relational keys.
   *
   * @param keys - Relational keys to remove from the relational table.
   */
  async removeByKeys(keys: string[]): Promise<void> {
    await this.db.delete(this.schema).where(inArray(this.schema.key, keys));
  }

  /**
   * Remove all relations bound to the given streams.
   *
   * @param streams - Streams to remove from the relational table.
   */
  async removeByStreams(streams: string[]): Promise<void> {
    await this.db.delete(this.schema).where(inArray(this.schema.stream, streams));
  }
}
