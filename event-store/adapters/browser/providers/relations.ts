import type { Collection } from "@valkyr/db";

import { RelationsProvider } from "~types/providers/relations.ts";
import type { Relation as Operation, RelationPayload } from "~types/relation.ts";

import type { Relation } from "../database.ts";

export class BrowserRelationsProvider implements RelationsProvider {
  constructor(readonly relations: Collection<Relation>) {}

  /**
   * Handle incoming relation operations.
   *
   * @param relations - List of relation operations to execute.
   */
  async handle(relations: Operation[]): Promise<void> {
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
    await this.relations.insertOne({ key, stream });
  }

  /**
   * Add stream to many relational keys onto the relations table.
   *
   * @param relations - Relations to insert.
   * @param batchSize - Batch size for the insert loop.
   */
  async insertMany(relations: { key: string; stream: string }[], batchSize: number = 1_000): Promise<void> {
    for (let i = 0; i < relations.length; i += batchSize) {
      await this.relations.insertMany(relations.slice(i, i + batchSize).map(({ key, stream }) => ({ key, stream })));
    }
  }

  /**
   * Get a list of event streams registered under the given relational key.
   *
   * @param key - Relational key to get event streams for.
   */
  async getByKey(key: string): Promise<string[]> {
    return this.relations.find({ key }).then((relations) => relations.map(({ stream }) => stream));
  }

  /**
   * Get a list of event streams registered under the given relational keys.
   *
   * @param keys - Relational keys to get event streams for.
   */
  async getByKeys(keys: string[]): Promise<string[]> {
    return this.relations.find({ key: { $in: keys } }).then((relations) => {
      const streamIds = new Set<string>();
      for (const relation of relations) {
        streamIds.add(relation.stream);
      }
      return Array.from(streamIds);
    });
  }

  /**
   * Removes a stream from the relational table.
   *
   * @param key    - Relational key to remove stream from.
   * @param stream - Stream to remove from relation.
   */
  async remove(key: string, stream: string): Promise<void> {
    await this.relations.remove({ key, stream });
  }

  /**
   * Removes multiple relational entries.
   *
   * @param relations - Relations to remove stream from.
   * @param batchSize - Batch size for the insert loop.
   */
  async removeMany(relations: RelationPayload[], batchSize: number = 1_000): Promise<void> {
    const promises = [];
    for (let i = 0; i < relations.length; i += batchSize) {
      for (const relation of relations.slice(i, i + batchSize)) {
        promises.push(this.remove(relation.key, relation.stream));
      }
    }
    await Promise.all(promises);
  }

  /**
   * Remove all relations bound to the given relational keys.
   *
   * @param keys - Relational keys to remove from the relational table.
   */
  async removeByKeys(keys: string[]): Promise<void> {
    await this.relations.remove({ key: { $in: keys } });
  }

  /**
   * Remove all relations bound to the given streams.
   *
   * @param streams - Streams to remove from the relational table.
   */
  async removeByStreams(streams: string[]): Promise<void> {
    await this.relations.remove({ stream: { $in: streams } });
  }
}
