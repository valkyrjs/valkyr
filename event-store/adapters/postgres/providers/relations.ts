import type { Helper } from "postgres";

import type { RelationsProvider } from "~types/providers/relations.ts";
import type { Relation, RelationPayload } from "~types/relation.ts";

import type { PostgresDatabase } from "../database.ts";

export class PostgresRelationsProvider implements RelationsProvider {
  constructor(readonly db: PostgresDatabase, readonly schema?: string) {}

  get table(): Helper<string, []> {
    if (this.schema !== undefined) {
      return this.db.sql(`${this.schema}.relations`);
    }
    return this.db.sql("public.relations");
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
    await this.db.sql`INSERT INTO ${this.table} (key, stream) VALUES (${key}, ${stream}) ON CONFLICT DO NOTHING`.catch((error) => {
      throw new Error(`EventStore > 'relations.insert' failed with postgres error: ${error.message}`);
    });
  }

  /**
   * Add stream to many relational keys onto the relations table.
   *
   * @param relations - Relations to insert.
   * @param batchSize - Batch size for the insert loop.
   */
  async insertMany(relations: RelationPayload[], batchSize: number = 1_000): Promise<void> {
    await this.db.sql.begin(async (sql) => {
      for (let i = 0; i < relations.length; i += batchSize) {
        const values = relations
          .slice(i, i + batchSize)
          .map(({ key, stream }) => [key, stream]);
        await sql`INSERT INTO ${this.table} (key, stream) VALUES ${sql(values)} ON CONFLICT DO NOTHING`;
      }
    }).catch((error) => {
      throw new Error(`EventStore > 'relations.insertMany' failed with postgres error: ${error.message}`);
    });
  }

  /**
   * Get a list of event streams registered under the given relational key.
   *
   * @param key - Relational key to get event streams for.
   */
  async getByKey(key: string): Promise<string[]> {
    return this.db.sql`SELECT stream FROM ${this.table} WHERE key = ${key}`.then((rows) => rows.map(({ stream }) => stream)).catch((error) => {
      throw new Error(`EventStore > 'relations.getByKey' failed with postgres error: ${error.message}`);
    });
  }

  /**
   * Get a list of event streams registered under the given relational keys.
   *
   * @param keys - Relational keys to get event streams for.
   */
  async getByKeys(keys: string[]): Promise<string[]> {
    return this.db.sql`SELECT DISTINCT stream FROM ${this.table} WHERE key IN ${this.db.sql(keys)}`.then((rows) => rows.map(({ stream }) => stream)).catch(
      (error) => {
        throw new Error(`EventStore > 'relations.getByKeys' failed with postgres error: ${error.message}`);
      },
    );
  }

  /**
   * Removes a stream from the relational table.
   *
   * @param key    - Relational key to remove stream from.
   * @param stream - Stream to remove from relation.
   */
  async remove(key: string, stream: string): Promise<void> {
    await this.db.sql`DELETE FROM ${this.table} WHERE key = ${key} AND stream = ${stream}`.catch((error) => {
      throw new Error(`EventStore > 'relations.remove' failed with postgres error: ${error.message}`);
    });
  }

  /**
   * Removes multiple relational entries.
   *
   * @param relations - Relations to remove stream from.
   * @param batchSize - Batch size for the insert loop.
   */
  async removeMany(relations: RelationPayload[], batchSize: number = 1_000): Promise<void> {
    await this.db.sql.begin(async (sql) => {
      for (let i = 0; i < relations.length; i += batchSize) {
        const conditions = relations.slice(i, i + batchSize).map(
          ({ key, stream }) => `(key = '${key}' AND stream = '${stream}')`,
        );
        await sql`DELETE FROM ${this.table} WHERE ${this.db.sql.unsafe(conditions.join(" OR "))}`;
      }
    }).catch((error) => {
      throw new Error(`EventStore > 'relations.removeMany' failed with postgres error: ${error.message}`);
    });
  }

  /**
   * Remove all relations bound to the given relational keys.
   *
   * @param keys - Relational keys to remove from the relational table.
   */
  async removeByKeys(keys: string[]): Promise<void> {
    await this.db.sql`DELETE FROM ${this.table} WHERE key IN ${keys}`.catch((error) => {
      throw new Error(`EventStore > 'relations.removeByKeys' failed with postgres error: ${error.message}`);
    });
  }

  /**
   * Remove all relations bound to the given streams.
   *
   * @param streams - Streams to remove from the relational table.
   */
  async removeByStreams(streams: string[]): Promise<void> {
    await this.db.sql`DELETE FROM ${this.table} WHERE stream IN ${streams}`.catch((error) => {
      throw new Error(`EventStore > 'relations.removeByStreams' failed with postgres error: ${error.message}`);
    });
  }
}
