import type { AggregateRoot } from "~libraries/aggregate.ts";

import type { Unknown } from "./common.ts";
import type { Event, EventRecord, EventStatus } from "./event.ts";
import type { InferReducerState, Reducer, ReducerLeftFold, ReducerState } from "./reducer.ts";
import type { ExcludeEmptyFields } from "./utilities.ts";

export type EventStore<TEvent extends Event, TRecord extends EventRecord> = {
  /*
   |--------------------------------------------------------------------------------
   | Factories
   |--------------------------------------------------------------------------------
   */

  /**
   * Make a new event.
   *
   * This simply creates a new compatible event object that can be added to the
   * store at a later time.
   *
   * @param event - Event data to make.
   */
  makeEvent<TEventType extends Event["type"]>(
    event: ExcludeEmptyFields<Extract<TEvent, { type: TEventType }>> & { stream?: string },
  ): TRecord;

  /**
   * Make a new event reducer based on the events registered with the event store.
   *
   * @param reducer - Reducer method to run over given events.
   * @param state   - Initial state.
   *
   * @example
   * ```ts
   * const fooReducer = eventStore.makeReducer<FooState>((state, event) => {
   *   switch (event.type) {
   *     case "FooCreated": {
   *       state.name = event.data.name;
   *       return state;
   *     }
   *   }
   *   return state;
   * }, {
   *   name: ""
   * });
   *
   * type FooState = { name: string };
   *
   * const state = await eventStore.reduce("stream-id", reducer);
   * ```
   */
  makeReducer<TState extends Unknown>(
    foldFn: ReducerLeftFold<TState, TRecord>,
    name: string,
    stateFn: ReducerState<TState>,
  ): Reducer<TRecord, TState>;

  /**
   * Make a new event reducer based on the events registered with the event store.
   *
   * @param aggregate - Aggregate class to create instance from.
   *
   * @example
   * ```ts
   * class Foo {
   *   name: string = "";
   *
   *   static #reducer = makeAggregateReducer(Foo, "foo");
   *
   *   static async getById(fooId: string): Promise<Foo | undefined> {
   *     return eventStore.reduce("stream-id", this.#reducer, { type: "stream" });
   *   }
   *
   *   with(event) {
   *     switch (event.type) {
   *       case "FooCreated": {
   *         this.name = event.data.name;
   *         break;
   *       }
   *     }
   *   }
   * });
   *
   * const reducer = makeAggregateReducer(Foo, "foo");
   *
   * const foo = await eventStore.reduce("stream-id", reducer, { type: "stream" });
   * ```
   */
  makeAggregateReducer<TAggregateRoot extends typeof AggregateRoot<TRecord>>(
    aggregate: TAggregateRoot,
    name: string,
  ): Reducer<TRecord, InstanceType<TAggregateRoot>>;

  /*
   |--------------------------------------------------------------------------------
   | Events
   |--------------------------------------------------------------------------------
   */

  /**
   * Check if the event store has an event of the given type.
   *
   * @param type - Event type to check for.
   */
  hasEvent(type: TEvent["type"]): boolean;

  /**
   * Add a new event to the events table.
   *
   * @param event    - Event data to record.
   * @param settings - Event settings which can modify insertion behavior.
   */
  addEvent<TEventType extends Event["type"]>(
    event: ExcludeEmptyFields<Extract<TEvent, { type: TEventType }>> & { stream?: string },
    settings?: EventsInsertSettings,
  ): Promise<void>;

  /**
   * Add many events in strict sequence to the events table.
   *
   * This method runs in a transaction and will fail all events if one or more
   * insertion failures occurs.
   *
   * @param events   - List of events to record.
   * @param settings - Event settings which can modify insertion behavior.
   */
  addManyEvents<TEventType extends Event["type"]>(
    event: (ExcludeEmptyFields<Extract<TEvent, { type: TEventType }>> & { stream: string })[],
    settings?: EventsInsertSettings,
  ): Promise<void>;

  /**
   * Insert an event record to the local event store database.
   *
   * @param record   - Event record to insert.
   * @param settings - Event settings which can modify insertion behavior.
   */
  pushEvent(record: TRecord, settings?: EventsInsertSettings): Promise<void>;

  /**
   * Add many events in strict sequence to the events table.
   *
   * This method runs in a transaction and will fail all events if one or more
   * insertion failures occurs.
   *
   * @param records  - List of event records to insert.
   * @param settings - Event settings which can modify insertion behavior.
   */
  pushManyEvents(records: TRecord[], settings?: EventsInsertSettings): Promise<void>;

  /**
   * Enable the ability to check an incoming events status in relation to the local
   * ledger. This is to determine what actions to take upon the ledger based on the
   * current status.
   *
   * **Exists**
   *
   * References the existence of the event in the local ledger. It is determined by
   * looking at the recorded event id which should be unique to the entirety of the
   * ledger.
   *
   * **Outdated**
   *
   * References the events created relationship to the same event type in the
   * hosted stream. If another event of the same type in the streamis newer than
   * the provided event, the provided event is considered outdated.
   */
  getEventStatus(event: TRecord): Promise<EventStatus>;

  /**
   * Retrieve events from the events table.
   *
   * @param options - Read options. (Optional)
   */
  getEvents(options?: EventReadOptions<TRecord>): Promise<TRecord[]>;

  /**
   * Retrieve events from the events table under the given streams.
   *
   * @param stream  - Stream to retrieve events for.
   * @param options - Stream logic options. (Optional)
   */
  getEventsByStreams(streams: string[], options?: EventReadOptions<TRecord>): Promise<TRecord[]>;

  /**
   * Retrieve all events under the given relational keys.
   *
   * @param keys    - Relational keys to retrieve events for.
   * @param options - Relational logic options. (Optional)
   */
  getEventsByRelations(keys: string[], options?: EventReadOptions<TRecord>): Promise<TRecord[]>;

  /*
   |--------------------------------------------------------------------------------
   | Reducers
   |--------------------------------------------------------------------------------
   */

  /**
   * Reduce events in the given stream to a entity state.
   *
   * @param query   - Reducer query to resolve event state from.
   * @param pending - List of non comitted events to append to the server events.
   *
   * @example
   * ```ts
   * const state = await eventStore.reduce({ stream, reducer });
   * ```
   *
   * @example
   * ```ts
   * const state = await eventStore.reduce({ relation: `foo:${foo}:bars`, reducer });
   * ```
   *
   * Reducers are created through the `.makeReducer` and `.makeAggregateReducer` method.
   */
  reduce<TReducer extends Reducer>(
    query: ReduceQuery<TRecord, TReducer>,
    pending?: TRecord[],
  ): Promise<ReturnType<TReducer["reduce"]> | undefined>;

  /*
   |--------------------------------------------------------------------------------
   | Snapshots
   |--------------------------------------------------------------------------------
   */

  /**
   * Create a new snapshot for the given stream/relation and reducer.
   *
   * @param query - Reducer query to create snapshot from.
   *
   * @example
   * ```ts
   * await eventStore.createSnapshot({ stream, reducer });
   * ```
   *
   * @example
   * ```ts
   * await eventStore.createSnapshot({ relation: `foo:${foo}:bars`, reducer });
   * ```
   */
  createSnapshot<TReducer extends Reducer>(query: ReduceQuery<TRecord, TReducer>): Promise<void>;

  /**
   * Get an entity state snapshot from the database. These are useful for when we
   * want to reduce the amount of events that has to be processed when fetching
   * state history for a reducer.
   *
   * @param streamOrRelation - Stream, or Relation to get snapshot for.
   * @param reducer          - Reducer to get snapshot for.
   *
   * @example
   * ```ts
   * const snapshot = await eventStore.getSnapshot(stream, reducer);
   * console.log(snapshot);
   * // {
   * //   cursor: "jxubdY-0",
   * //   state: {
   * //     foo: "bar"
   * //   }
   * // }
   * ```
   *
   * @example
   * ```ts
   * const snapshot = await eventStore.getSnapshot(`foo:${foo}:bars`, reducer);
   * console.log(snapshot);
   * // {
   * //   cursor: "jxubdY-0",
   * //   state: {
   * //     count: 1
   * //   }
   * // }
   * ```
   */
  getSnapshot<TReducer extends Reducer, TState = InferReducerState<TReducer>>(
    stream: string,
    reducer: TReducer,
  ): Promise<{ cursor: string; state: TState } | undefined>;

  /**
   * Delete a snapshot.
   *
   * @param streamOrRelation - Stream, or Relation to delete snapshot for.
   * @param reducer          - Reducer to remove snapshot for.
   *
   * @example
   * ```ts
   * await eventStore.deleteSnapshot(stream, reducer);
   * ```
   *
   * @example
   * ```ts
   * await eventStore.deleteSnapshot(`foo:${foo}:bars`, reducer);
   * ```
   */
  deleteSnapshot<TReducer extends Reducer>(stream: string, reducer: TReducer): Promise<void>;
};

/*
 |--------------------------------------------------------------------------------
 | Hooks
 |--------------------------------------------------------------------------------
 */

export type EventStoreHooks<TRecord extends EventRecord> = Partial<{
  /**
   * Triggered when `.pushEvent` and `.pushManyEvents` has completed successfully.
   *
   * @param records  - List of event records inserted.
   * @param settings - Event insert settings used.
   */
  onEventsInserted(records: TRecord[], settings: EventsInsertSettings): Promise<void>;

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

export type ReduceQuery<TRecord extends EventRecord, TReducer extends Reducer> =
  | ({
    /**
     * Stream to fetch events from and pass to the reducer method.
     */
    stream: string;

    relation?: never;

    /**
     * Reducer method to pass resolved events to.
     */
    reducer: TReducer;
  } & EventReadOptions<TRecord>)
  | (
    & {
      stream?: never;

      /**
       * Relational key resolving streams to fetch events from and pass to the
       * reducer method.
       */
      relation: string;

      /**
       * Reducer method to pass resolved events to.
       */
      reducer: TReducer;
    }
    & EventReadOptions<TRecord>
  );

export type EventsInsertSettings = {
  batch?: string;
};

export type EventReadOptions<TRecord extends EventRecord> = {
  /**
   * Filter options for how events are pulled from the store.
   */
  filter?: {
    /**
     * Only include events in the given types.
     */
    types?: TRecord["type"][];
  };

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
