import type { Event, EventToRecord } from "../event.ts";
import type { EventReadOptions } from "../event-store.ts";

export type EventProvider<TEvent extends Event> = {
  /**
   * Insert a new event record to the events table.
   *
   * @param record - Event record to insert.
   */
  insert(record: EventToRecord<TEvent>): Promise<void>;

  /**
   * Insert many new event records to the events table.
   *
   * @param records   - Event records to insert.
   * @param batchSize - Batch size for the insert loop. Default: 1_000
   */
  insertMany(records: EventToRecord<TEvent>[], batchSize?: number): Promise<void>;

  /**
   * Retrieve all the events in the events table. Optionally a cursor and direction
   * can be provided to reduce the list of events returned.
   *
   * @param options - Find options.
   */
  get(options?: EventReadOptions<TEvent>): Promise<EventToRecord<TEvent>[]>;

  /**
   * Get events within the given stream.
   *
   * @param stream  - Stream to fetch events for.
   * @param options - Read options for modifying the result.
   */
  getByStream(stream: string, options?: EventReadOptions<TEvent>): Promise<EventToRecord<TEvent>[]>;

  /**
   * Get events within given list of streams.
   *
   * @param streams - Stream to get events for.
   * @param options - Read options for modifying the result.
   */
  getByStreams(streams: string[], options?: EventReadOptions<TEvent>): Promise<EventToRecord<TEvent>[]>;

  /**
   * Get a single event by its id.
   *
   * @param id - Event id.
   */
  getById(id: string): Promise<EventToRecord<TEvent> | undefined>;

  /**
   * Check if the given event is outdated in relation to the local event data.
   */
  checkOutdated({ stream, type, created }: EventToRecord<TEvent>): Promise<boolean>;
};
