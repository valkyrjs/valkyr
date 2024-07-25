import type { Collection } from "@valkyr/db";

import type { EventRecord } from "~types/event.ts";
import type { EventReadOptions } from "~types/event-store.ts";

export class EventProvider<TEventRecord extends EventRecord> {
  constructor(readonly events: Collection<EventRecord>) {}

  /**
   * Insert a new event record to the events table.
   *
   * @param record - Event record to insert.
   * @param tx     - Transaction to insert the record within. (Optional)
   */
  async insert(record: TEventRecord): Promise<void> {
    await this.events.insertOne(record);
  }

  /**
   * Retrieve all the events in the events table. Optionally a cursor and direction
   * can be provided to reduce the list of events returned.
   *
   * @param options - Find options.
   */
  async get({ cursor, direction }: EventReadOptions = {}): Promise<TEventRecord[]> {
    const filter: any = {};
    if (cursor !== undefined) {
      filter.created = {
        [direction === "desc" ? "$lt" : "$gt"]: cursor,
      };
    }
    return await this.events.find(filter, { sort: { created: 1 } }) as TEventRecord[];
  }

  /**
   * Get events within the given stream.
   *
   * @param stream  - Stream to fetch events for.
   * @param options - Read options for modifying the result.
   */
  async getByStream(stream: string, { cursor, direction }: EventReadOptions = {}): Promise<TEventRecord[]> {
    const filter: any = {};
    if (stream !== undefined) {
      filter.stream = stream;
    }
    if (cursor !== undefined) {
      filter.created = {
        [direction === "desc" ? "$lt" : "$gt"]: cursor,
      };
    }
    return await this.events.find(filter, { sort: { created: 1 } }) as TEventRecord[];
  }

  /**
   * Get events within given list of streams.
   *
   * @param streams - Stream to get events for.
   */
  async getByStreams(streams: string[]): Promise<TEventRecord[]> {
    return await this.events.find({ stream: { $in: streams } }, { sort: { created: 1 } }) as TEventRecord[];
  }

  /**
   * Get a single event by its id.
   *
   * @param id - Event id.
   */
  async getById(id: string): Promise<TEventRecord | undefined> {
    return await this.events.findById(id) as TEventRecord | undefined;
  }

  /**
   * Check if the given event is outdated in relation to the local event data.
   */
  async checkOutdated({ stream, type, created }: TEventRecord): Promise<boolean> {
    const count = await this.events.count({
      stream,
      type,
      created: {
        $gt: created,
      },
    });
    return count > 0;
  }
}
