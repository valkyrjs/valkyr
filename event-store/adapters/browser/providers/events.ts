import type { Collection } from "@valkyr/db";

import type { Event, EventToRecord } from "~types/event.ts";
import type { EventReadOptions } from "~types/event-store.ts";
import { EventsProvider } from "~types/providers/events.ts";

export class BrowserEventsProvider<const TEvent extends Event> implements EventsProvider<TEvent> {
  constructor(readonly events: Collection<EventToRecord<TEvent>>) {}

  /**
   * Insert a new event record to the events table.
   *
   * @param record - Event record to insert.
   * @param tx     - Transaction to insert the record within. (Optional)
   */
  async insert(record: EventToRecord<TEvent>): Promise<void> {
    await this.events.insertOne(record);
  }

  /**
   * Insert many new event records to the events table.
   *
   * @param records   - Event records to insert.
   * @param batchSize - Batch size for the insert loop.
   */
  async insertMany(records: EventToRecord<TEvent>[], batchSize: number = 1_000): Promise<void> {
    for (let i = 0; i < records.length; i += batchSize) {
      await this.events.insertMany(records.slice(i, i + batchSize));
    }
  }

  /**
   * Retrieve all the events in the events table. Optionally a cursor and direction
   * can be provided to reduce the list of events returned.
   *
   * @param options - Find options.
   */
  async get({ filter, cursor, direction }: EventReadOptions<EventToRecord<TEvent>> = {}): Promise<EventToRecord<TEvent>[]> {
    const query: any = {};
    if (filter?.types !== undefined) {
      withTypes(query, filter.types);
    }
    if (cursor !== undefined) {
      withCursor(query, cursor, direction);
    }
    return await this.events.find(query, { sort: { created: 1 } }) as EventToRecord<TEvent>[];
  }

  /**
   * Get events within the given stream.
   *
   * @param stream  - Stream to fetch events for.
   * @param options - Read options for modifying the result.
   */
  async getByStream(stream: string, { filter, cursor, direction }: EventReadOptions<EventToRecord<TEvent>> = {}): Promise<EventToRecord<TEvent>[]> {
    const query: any = { stream };
    if (filter?.types !== undefined) {
      withTypes(query, filter.types);
    }
    if (cursor !== undefined) {
      withCursor(query, cursor, direction);
    }
    return await this.events.find(query, { sort: { created: 1 } }) as EventToRecord<TEvent>[];
  }

  /**
   * Get events within given list of streams.
   *
   * @param streams - Stream to get events for.
   */
  async getByStreams(streams: string[], { filter, cursor, direction }: EventReadOptions<EventToRecord<TEvent>> = {}): Promise<EventToRecord<TEvent>[]> {
    const query: any = { stream: { $in: streams } };
    if (filter?.types !== undefined) {
      withTypes(query, filter.types);
    }
    if (cursor !== undefined) {
      withCursor(query, cursor, direction ?? "asc");
    }
    return await this.events.find(query, { sort: { created: 1 } }) as EventToRecord<TEvent>[];
  }

  /**
   * Get a single event by its id.
   *
   * @param id - Event id.
   */
  async getById(id: string): Promise<EventToRecord<TEvent> | undefined> {
    return await this.events.findById(id) satisfies EventToRecord<TEvent> | undefined;
  }

  /**
   * Check if the given event is outdated in relation to the local event data.
   */
  async checkOutdated({ stream, type, created }: EventToRecord<TEvent>): Promise<boolean> {
    const count = await this.events.count({
      stream,
      type,
      created: {
        $gt: created,
      },
    } as any);
    return count > 0;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Query Builders
 |--------------------------------------------------------------------------------
 */

function withTypes(filter: any, types: string[]): void {
  filter.type = { $in: types };
}

function withCursor(filter: any, cursor: string, direction?: 1 | -1 | "asc" | "desc"): void {
  if (cursor !== undefined) {
    filter.created = {
      [direction === "desc" || direction === -1 ? "$lt" : "$gt"]: cursor,
    };
  }
}
