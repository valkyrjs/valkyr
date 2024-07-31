import { type Database, takeOne } from "@valkyr/toolkit/drizzle";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { SQLiteSelectQueryBuilder } from "drizzle-orm/sqlite-core";

import type { EventRecord } from "~types/event.ts";
import type { EventReadOptions } from "~types/event-store.ts";

import type { EventStoreDB } from "../database.ts";
import { events as schema } from "./schema.ts";

export class EventProvider<TRecord extends EventRecord> {
  constructor(readonly db: Database<EventStoreDB>) {}

  /**
   * Insert a new event record to the events table.
   *
   * @param record - Event record to insert.
   * @param tx     - Transaction to insert the record within. (Optional)
   */
  async insert(record: TRecord, tx?: Parameters<Parameters<EventStoreDB["transaction"]>[0]>[0]): Promise<void> {
    if (tx !== undefined) {
      await tx.insert(schema).values(record);
    } else {
      await this.db.insert(schema).values(record);
    }
  }

  /**
   * Retrieve all the events in the events table. Optionally a cursor and direction
   * can be provided to reduce the list of events returned.
   *
   * @param options - Find options.
   */
  async get({ filter, cursor, direction }: EventReadOptions<TRecord> = {}): Promise<TRecord[]> {
    let query = this.db.select().from(schema).$dynamic();
    if (filter?.types !== undefined) {
      query = withTypes(query, filter.types);
    }
    if (cursor) {
      query = withCursor(query, cursor, direction);
    }
    return (await query.orderBy(schema.created)) as TRecord[];
  }

  /**
   * Get events within the given stream.
   *
   * @param stream  - Stream to fetch events for.
   * @param options - Read options for modifying the result.
   */
  async getByStream(stream: string, { filter, cursor, direction }: EventReadOptions<TRecord> = {}): Promise<TRecord[]> {
    let query = this.db.select().from(schema).where(eq(schema.stream, stream)).$dynamic();
    if (filter?.types !== undefined) {
      query = withTypes(query, filter.types);
    }
    if (cursor) {
      query = withCursor(query, cursor, direction);
    }
    return (await query.orderBy(schema.created)) as TRecord[];
  }

  /**
   * Get events within given list of streams.
   *
   * @param streams - Stream to get events for.
   * @param options - Read options for modifying the result.
   */
  async getByStreams(streams: string[], { filter, cursor, direction }: EventReadOptions<TRecord> = {}): Promise<TRecord[]> {
    let query = this.db.select().from(schema).where(inArray(schema.stream, streams)).$dynamic();
    if (filter?.types !== undefined) {
      query = withTypes(query, filter.types);
    }
    if (cursor) {
      query = withCursor(query, cursor, direction);
    }
    return (await query.orderBy(schema.created)) as TRecord[];
  }

  /**
   * Get a single event by its id.
   *
   * @param id - Event id.
   */
  async getById(id: string): Promise<TRecord | undefined> {
    return await this.db.select().from(schema).where(eq(schema.id, id)).then(takeOne) as TRecord | undefined;
  }

  /**
   * Check if the given event is outdated in relation to the local event data.
   */
  async checkOutdated({ stream, type, created }: EventRecord): Promise<boolean> {
    const { count } = await this.db.select({ count: sql<number>`count(*)` }).from(schema).where(and(
      eq(schema.stream, stream),
      eq(schema.type, type),
      gt(schema.created, created),
    )).then((result) => result[0]);
    return count > 0;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Query Builders
 |--------------------------------------------------------------------------------
 */

function withTypes<T extends SQLiteSelectQueryBuilder>(qb: T, types: string[]): T {
  return qb.where(inArray(schema.type, types));
}

function withCursor<T extends SQLiteSelectQueryBuilder>(qb: T, cursor: string, direction: "asc" | "desc" | undefined): T {
  if (direction === "desc") {
    return qb.where(lt(schema.created, cursor));
  }
  return qb.where(gt(schema.created, cursor));
}
