import type { Collection } from "mongodb";

import { RelationsProvider } from "~types/providers/relations.ts";
import type { Relation, RelationPayload } from "~types/relation.ts";

import { type RelationSchema, schema } from "../collections/relations.ts";
import { DatabaseAccessor } from "../types.ts";
import { toParsedRecord, toParsedRecords } from "../utilities.ts";

export class MongoRelationsProvider implements RelationsProvider {
  readonly #accessor: DatabaseAccessor;

  constructor(accessor: DatabaseAccessor) {
    this.#accessor = accessor;
  }

  get collection(): Collection<RelationSchema> {
    return this.#accessor.db.collection<RelationSchema>("relations");
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
    await this.collection.updateOne({ key }, { $addToSet: { streams: stream } }, { upsert: true });
  }

  /**
   * Add stream to many relational keys onto the relations table.
   *
   * @param relations - Relations to insert.
   */
  async insertMany(relations: RelationPayload[], batchSize = 1_000): Promise<void> {
    const reduced = relations.reduce((map, { key, stream }) => {
      if (map.has(key) === false) {
        map.set(key, new Set<string>());
      }
      map.get(key)!.add(stream);
      return map;
    }, new Map<string, Set<string>>());

    const bulkOps = [];
    for (const [key, streams] of reduced) {
      bulkOps.push({
        updateOne: {
          filter: { key },
          update: { $addToSet: { streams: { $each: Array.from(streams) } } },
          upsert: true,
        },
      });
    }

    for (let i = 0; i < bulkOps.length; i += batchSize) {
      await this.collection.bulkWrite(bulkOps.slice(i, i + batchSize), { ordered: false });
    }
  }

  /**
   * Get a list of event streams registered under the given relational key.
   *
   * @param key - Relational key to get event streams for.
   */
  async getByKey(key: string): Promise<string[]> {
    const relations = await this.collection.findOne({ key }).then(toParsedRecord(schema));
    if (relations === undefined) {
      return [];
    }
    return relations.streams;
  }

  /**
   * Get a list of event streams registered under the given relational keys.
   *
   * @param keys - Relational keys to get event streams for.
   */
  async getByKeys(keys: string[]): Promise<string[]> {
    const streams = new Set<string>();

    const documents = await this.collection.find({ key: { $in: keys } }).toArray().then(toParsedRecords(schema));
    documents.forEach((document) => {
      for (const stream of document.streams) {
        streams.add(stream);
      }
    });

    return Array.from(streams);
  }

  /**
   * Removes a stream from the relational table.
   *
   * @param key    - Relational key to remove stream from.
   * @param stream - Stream to remove from relation.
   */
  async remove(key: string, stream: string): Promise<void> {
    await this.collection.updateOne({ key }, { $pull: { streams: stream } });
  }

  /**
   * Removes multiple relational entries.
   *
   * @param relations - Relations to remove stream from.
   */
  async removeMany(relations: RelationPayload[], batchSize = 1_000): Promise<void> {
    const reduced = relations.reduce((map, { key, stream }) => {
      if (!map.has(key)) {
        map.set(key, new Set());
      }
      map.get(key)!.add(stream);
      return map;
    }, new Map<string, Set<string>>());

    const bulkOps = [];
    for (const [key, streams] of reduced) {
      bulkOps.push({
        updateOne: {
          filter: { key },
          update: { $pull: { streams: { $in: Array.from(streams) } } },
        },
      });
    }

    for (let i = 0; i < bulkOps.length; i += batchSize) {
      await this.collection.bulkWrite(bulkOps.slice(i, i + batchSize), { ordered: false });
    }
  }

  /**
   * Remove all relations bound to the given relational keys.
   *
   * @param keys - Relational keys to remove from the relational table.
   */
  async removeByKeys(keys: string[]): Promise<void> {
    await this.collection.deleteMany({ key: { $in: keys } });
  }

  /**
   * Remove all relations bound to the given streams.
   *
   * @param streams - Streams to remove from the relational table.
   */
  async removeByStreams(streams: string[]): Promise<void> {
    await this.collection.bulkWrite(streams.map((stream) => ({
      updateOne: {
        filter: { streams: stream },
        update: { $pull: { streams: stream } },
      },
    })));
  }
}
