import type { Relation, RelationPayload } from "../relation.ts";

export type RelationsProvider = {
  /**
   * Handle incoming relation operations.
   *
   * @param relations - List of relation operations to execute.
   */
  handle(relations: Relation[]): Promise<void>;

  /**
   * Add stream to the relations table.
   *
   * @param key    - Relational key to add stream to.
   * @param stream - Stream to add to the key.
   */
  insert(key: string, stream: string): Promise<void>;

  /**
   * Add stream to many relational keys onto the relations table.
   *
   * @param relations - Relations to insert.
   * @param batchSize - Batch size for the insert loop. Default: 1_000
   */
  insertMany(relations: RelationPayload[], batchSize?: number): Promise<void>;

  /**
   * Get a list of event streams registered under the given relational key.
   *
   * @param key - Relational key to get event streams for.
   */
  getByKey(key: string): Promise<string[]>;

  /**
   * Get a list of event streams registered under the given relational keys.
   *
   * @param keys - Relational keys to get event streams for.
   */
  getByKeys(keys: string[]): Promise<string[]>;

  /**
   * Removes a stream from the relational table.
   *
   * @param key    - Relational key to remove stream from.
   * @param stream - Stream to remove from relation.
   */
  remove(key: string, stream: string): Promise<void>;

  /**
   * Removes multiple relational entries.
   *
   * @param relations - Relations to remove stream from.
   * @param batchSize - Batch size for the insert loop. Default: 1_000
   */
  removeMany(relations: RelationPayload[], batchSize?: number): Promise<void>;

  /**
   * Remove all relations bound to the given relational keys.
   *
   * @param keys - Relational keys to remove from the relational table.
   */
  removeByKeys(keys: string[]): Promise<void>;

  /**
   * Remove all relations bound to the given streams.
   *
   * @param streams - Streams to remove from the relational table.
   */
  removeByStreams(streams: string[]): Promise<void>;
};
