import type { AnyZodObject, ZodUnion } from "zod";

import type { Event, EventToRecord } from "./event.ts";
import { EventsProvider } from "./providers/events.ts";
import { RelationsProvider } from "./providers/relations.ts";
import { SnapshotsProvider } from "./providers/snapshots.ts";
import type { Reducer } from "./reducer.ts";

export type EventStoreConfig<TEvent extends Event, TEventStoreAdapter extends EventStoreAdapter<TEvent>> = {
  adapter: TEventStoreAdapter;
  events: EventList<TEvent>;
  validators: ValidatorConfig<TEvent>;
  snapshot?: "manual" | "auto";
  hooks?: EventStoreHooks<TEvent>;
};

export type EventStoreAdapter<TEvent extends Event> = {
  readonly providers: {
    readonly events: EventsProvider<TEvent>;
    readonly relations: RelationsProvider;
    readonly snapshots: SnapshotsProvider;
  };
};

export type ValidatorConfig<TEvent extends Event> = {
  data: Map<TEvent["type"], AnyZodObject | ZodUnion<any>>;
  meta: Map<TEvent["type"], AnyZodObject | ZodUnion<any>>;
};

export type EventList<E extends Event> = Set<E["type"]>;

/*
 |--------------------------------------------------------------------------------
 | Hooks
 |--------------------------------------------------------------------------------
 */

export type EventStoreHooks<TEvent extends Event> = Partial<{
  /**
   * Triggered when `.pushEvent` and `.pushManyEvents` has completed successfully.
   *
   * @param records  - List of event records inserted.
   * @param settings - Event insert settings used.
   */
  onEventsInserted(records: EventToRecord<TEvent>[], settings: EventsInsertSettings): Promise<void>;

  /**
   * Triggered when an unhandled exception is thrown during `.pushEvent` and
   * `.pushManyEvents` hook.
   *
   * @param error - Error that was thrown.
   */
  onError(error: unknown): Promise<void>;
}>;

/*
 |--------------------------------------------------------------------------------
 | Query Types
 |--------------------------------------------------------------------------------
 */

export type ReduceQuery<TEvent extends Event, TReducer extends Reducer> =
  | ({
    /**
     * Name of the reducer, must be a unique identifier as its used by snapshotter
     * to store, and manage state snapshots for event streams.
     */
    name: string;

    /**
     * Stream to fetch events from and pass to the reducer method.
     */
    stream: string;

    /**
     * Reducer method to pass resolved events to.
     */
    reducer: TReducer;

    relation?: never;
  } & EventReadFilter<EventToRecord<TEvent>>)
  | (
    & {
      /**
       * Name of the reducer, must be a unique identifier as its used by snapshotter
       * to store, and manage state snapshots for event streams.
       */
      name: string;

      /**
       * Relational key resolving streams to fetch events from and pass to the
       * reducer method.
       */
      relation: string;

      /**
       * Reducer method to pass resolved events to.
       */
      reducer: TReducer;

      stream?: never;
    }
    & EventReadFilter<EventToRecord<TEvent>>
  );

export type EventsInsertSettings = {
  /**
   * Should the event store emit events after successfull insertion.
   * This only takes false as value and by default events are always
   * projected.
   */
  emit?: false;

  /**
   * Batch key that can be used to group several events in a single
   * batched operation for performance sensitive handling.
   */
  batch?: string;
};

export type EventReadOptions<TEvent extends Event> = EventReadFilter<EventToRecord<TEvent>> & {
  /**
   * Fetches events from the specific cursor, which uses the local event
   * records `recorded` timestamp.
   */
  cursor?: string;

  /**
   * Fetch events in ascending or descending order. Default: "asc"
   */
  direction?: 1 | -1 | "asc" | "desc";

  /**
   * Limit the number of events returned.
   */
  limit?: number;
};

export type EventReadFilter<TEvent extends Event> = {
  /**
   * Filter options for how events are pulled from the store.
   */
  filter?: {
    /**
     * Only include events in the given types.
     */
    types?: TEvent["type"][];
  };
};
