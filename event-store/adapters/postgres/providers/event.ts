import type { Helper } from "postgres";

import type { Event, EventToRecord } from "~types/event.ts";
import type { EventReadOptions } from "~types/event-store.ts";
import { EventsProvider } from "~types/providers/events.ts";

import type { PostgresDatabase } from "../database.ts";

export class PostgresEventsProvider<TEvent extends Event> implements EventsProvider<TEvent> {
  constructor(readonly db: PostgresDatabase, readonly schema?: string) {}

  get table(): Helper<string, []> {
    if (this.schema !== undefined) {
      return this.db.sql(`${this.schema}.events`);
    }
    return this.db.sql("public.events");
  }

  /**
   * Insert a new event record to the events table.
   *
   * @param record - Event record to insert.
   */
  async insert(record: EventToRecord<TEvent>): Promise<void> {
    await this.db.sql`INSERT INTO ${this.table} ${this.db.sql([record] as object[])}`.catch((error) => {
      throw new Error(`EventStore > 'events.insert' failed with postgres error: ${error.message}`);
    });
  }

  /**
   * Insert many new event records to the events table.
   *
   * @param records   - Event records to insert.
   * @param batchSize - Batch size for the insert loop.
   */
  async insertMany(records: EventToRecord<TEvent>[], batchSize: number = 1_000): Promise<void> {
    await this.db.sql.begin(async (sql) => {
      for (let i = 0; i < records.length; i += batchSize) {
        await sql`INSERT INTO ${this.table} ${this.db.sql(records.slice(i, i + batchSize) as object[])}`;
      }
    }).catch((error) => {
      throw new Error(`EventStore > 'events.insertMany' failed with postgres error: ${error.message}`);
    });
  }

  /**
   * Retrieve all the events in the events table. Optionally a cursor and direction
   * can be provided to reduce the list of events returned.
   *
   * @param options - Find options.
   */
  async get(options: EventReadOptions<TEvent>): Promise<EventToRecord<TEvent>[]> {
    if (options !== undefined) {
      const { filter, cursor, direction, limit } = options;
      return this.db.sql`
        SELECT * FROM ${this.table} 
        WHERE
          ${filter?.types ? this.#withTypes(filter.types) : this.db.sql``}
          ${cursor ? this.#withCursor(cursor, direction) : this.db.sql``}
        ORDER BY created ASC
        ${limit ? this.#withLimit(limit) : this.db.sql``}
      `;
    }
    return this.db.sql`SELECT * FROM ${this.table} ORDER BY created ASC`;
  }

  /**
   * Get events within the given stream.
   *
   * @param stream  - Stream to fetch events for.
   * @param options - Read options for modifying the result.
   */
  async getByStream(stream: string, { filter, cursor, direction, limit }: EventReadOptions<TEvent> = {}): Promise<EventToRecord<TEvent>[]> {
    return this.db.sql`
      SELECT * FROM ${this.table} 
      WHERE 
        stream = ${stream}
        ${filter?.types ? this.#withTypes(filter.types) : this.db.sql``}
        ${cursor ? this.#withCursor(cursor, direction) : this.db.sql``}
      ORDER BY created ASC
      ${limit ? this.#withLimit(limit) : this.db.sql``}
    `;
  }

  /**
   * Get events within given list of streams.
   *
   * @param streams - Stream to get events for.
   * @param options - Read options for modifying the result.
   */
  async getByStreams(streams: string[], { filter, cursor, direction, limit }: EventReadOptions<TEvent> = {}): Promise<EventToRecord<TEvent>[]> {
    return this.db.sql`
      SELECT * FROM ${this.table} 
      WHERE 
        stream IN ${this.db.sql(streams)}
        ${filter?.types ? this.#withTypes(filter.types) : this.db.sql``}
        ${cursor ? this.#withCursor(cursor, direction) : this.db.sql``}
      ORDER BY created ASC
      ${limit ? this.#withLimit(limit) : this.db.sql``}
    `;
  }

  /**
   * Get a single event by its id.
   *
   * @param id - Event id.
   */
  async getById(id: string): Promise<EventToRecord<TEvent> | undefined> {
    return this.db.sql`SELECT * FROM ${this.table} WHERE id = ${id}`.then(([row]) => row as (EventToRecord<TEvent> | undefined));
  }

  /**
   * Check if the given event is outdated in relation to the local event data.
   */
  async checkOutdated({ stream, type, created }: EventToRecord<TEvent>): Promise<boolean> {
    const count = await await this.db.sql`
      SELECT COUNT(*) AS count
      FROM ${this.table}
      WHERE
        stream = ${stream}
        AND type = ${type}
        AND created > ${created}
    `.then((result: any) => Number(result[0]));
    return count > 0;
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  #withTypes(types: string[]) {
    return this.db.sql`AND type IN ${this.db.sql(types)}`;
  }

  #withCursor(cursor: string, direction?: 1 | -1 | "asc" | "desc") {
    if (direction === "desc" || direction === -1) {
      return this.db.sql`AND created < ${cursor}`;
    }
    return this.db.sql`AND created > ${cursor}`;
  }

  #withLimit(limit: number) {
    return this.db.sql`LIMIT ${limit}`;
  }
}
