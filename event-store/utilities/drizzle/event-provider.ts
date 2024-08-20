import { type Database, takeOne } from "@valkyr/toolkit/drizzle";
import { and, eq, gt, inArray, lt, SQL, sql } from "drizzle-orm";

import type { EventStoreDB as PGEventStoreDB, Transaction as PGTransaction } from "~stores/pg/database.ts";
import type { PGEventTable } from "~stores/pg/events.ts";
import type { EventStoreDB as SQLiteEventStoreDB, Transaction as SQLiteTransaction } from "~stores/sqlite/database.ts";
import type { SQLiteEventTable } from "~stores/sqlite/events.ts";
import type { EventRecord } from "~types/event.ts";
import type { EventReadOptions } from "~types/event-store.ts";

export class EventProvider<TRecord extends EventRecord> {
  readonly db: Database<PGEventStoreDB>;
  readonly schema: PGEventTable;

  constructor(db: Database<PGEventStoreDB> | PGTransaction, schema: PGEventTable);
  constructor(db: Database<SQLiteEventStoreDB> | SQLiteTransaction, schema: SQLiteEventTable);
  constructor(db: any, schema: any) {
    this.db = db;
    this.schema = schema;
  }

  /**
   * Insert a new event record to the events table.
   *
   * @param record - Event record to insert.
   * @param tx     - Transaction to insert the record within. (Optional)
   */
  async insert(record: TRecord): Promise<void> {
    await this.db.insert(this.schema).values(record);
  }

  /**
   * Batch insert a large amount of event records.
   *
   * @param records   - Event records to insert.
   * @param batchSize - Batch size for the insert loop.
   */
  async insertBatch(records: TRecord[], batchSize: number = 1_000): Promise<void> {
    for (let i = 0; i < records.length; i += batchSize) {
      await this.db.insert(this.schema).values(records.slice(i, i + batchSize));
    }
  }

  /**
   * Retrieve all the events in the events table. Optionally a cursor and direction
   * can be provided to reduce the list of events returned.
   *
   * @param options - Find options.
   */
  async get(options: EventReadOptions<TRecord> = {}): Promise<TRecord[]> {
    const filters = this.#withFilters(options);
    if (filters.length !== 0) {
      return await this.db.select().from(this.schema).where(and(...filters)).orderBy(this.schema.created) as TRecord[];
    }
    return await this.db.select().from(this.schema).orderBy(this.schema.created) as TRecord[];
  }

  /**
   * Get events within the given stream.
   *
   * @param stream  - Stream to fetch events for.
   * @param options - Read options for modifying the result.
   */
  async getByStream(stream: string, options: EventReadOptions<TRecord> = {}): Promise<TRecord[]> {
    const filters = this.#withFilters(options, [eq(this.schema.stream, stream)]);
    if (filters.length > 1) {
      return await this.db.select().from(this.schema).where(and(...filters)).orderBy(this.schema.created) as TRecord[];
    }
    return await this.db.select().from(this.schema).where(filters[0]).orderBy(this.schema.created) as TRecord[];
  }

  /**
   * Get events within given list of streams.
   *
   * @param streams - Stream to get events for.
   * @param options - Read options for modifying the result.
   */
  async getByStreams(streams: string[], options: EventReadOptions<TRecord> = {}): Promise<TRecord[]> {
    const filters = this.#withFilters(options, [inArray(this.schema.stream, streams)]);
    if (filters.length > 1) {
      return await this.db.select().from(this.schema).where(and(...filters)).orderBy(this.schema.created) as TRecord[];
    }
    return await this.db.select().from(this.schema).where(filters[0]).orderBy(this.schema.created) as TRecord[];
  }

  /**
   * Get a single event by its id.
   *
   * @param id - Event id.
   */
  async getById(id: string): Promise<TRecord | undefined> {
    return await this.db.select().from(this.schema).where(eq(this.schema.id, id)).then(takeOne) as TRecord | undefined;
  }

  /**
   * Check if the given event is outdated in relation to the local event data.
   */
  async checkOutdated({ stream, type, created }: TRecord): Promise<boolean> {
    const { count } = await this.db.select({ count: sql<number>`count(*)` }).from(this.schema).where(and(
      eq(this.schema.stream, stream),
      eq(this.schema.type, type),
      gt(this.schema.created, created),
    )).then((result: any) => result[0]);
    return count > 0;
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  #withFilters<TRecord extends EventRecord>({ filter, cursor, direction }: EventReadOptions<TRecord>, filters: SQL<unknown>[] = []) {
    if (filter?.types !== undefined) {
      filters.push(this.#withTypes(filter.types));
    }
    if (cursor) {
      filters.push(this.#withCursor(cursor, direction));
    }
    return filters;
  }

  #withTypes(types: string[]) {
    return inArray(this.schema.type, types);
  }

  #withCursor(cursor: string, direction: "asc" | "desc" | undefined) {
    if (direction === "desc") {
      return lt(this.schema.created, cursor);
    }
    return gt(this.schema.created, cursor);
  }
}
