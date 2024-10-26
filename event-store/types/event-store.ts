import type { AggregateRoot } from "~libraries/aggregate.ts";
import type { PostEventInsertError, PreEventInsertError } from "~libraries/errors.ts";

import type { Unknown } from "./common.ts";
import type { Event, EventRecord, EventStatus } from "./event.ts";
import type { InferReducerState, Reducer, ReducerConfig, ReducerLeftFold, ReducerState } from "./reducer.ts";
import type { ExcludeEmptyFields } from "./utilities.ts";

export type EventStore<TEvent extends Event, TRecord extends EventRecord> = {
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
   * Add a new event onto the local event store database.
   *
   * Push is meant to take events from the local services and insert them as new
   * event records as non hydrated events.
   *
   * @param event - Event data to record.
   */
  addEvent<TEventType extends Event["type"]>(
    event: ExcludeEmptyFields<Extract<TEvent, { type: TEventType }>> & { stream?: string },
  ): Promise<string>;

  /**
   * Add multiple new events sequentially onto the local event store database in
   * a all or nothing pattern.
   *
   * @param events - List of events to process.
   */
  addEventSequence<TEventType extends Event["type"]>(
    event: (ExcludeEmptyFields<Extract<TEvent, { type: TEventType }>> & { stream: string })[],
  ): Promise<void>;

  /**
   * Insert an event record to the local event store database.
   *
   * This method triggers event validation and projection. If validation fails the
   * event will not be inserted. If the projection fails the projection itself
   * should be handling the error based on its own business logic.
   *
   * When hydration is true the event will be recorded with a new locally generated
   * timestamp as its being recorded locally but is not the originator of the event
   * creation.
   *
   * @param record   - EventRecord to insert.
   * @param hydrated - Whether the event is hydrated or not. (Optional)
   */
  pushEvent(record: TRecord, hydrated?: boolean): Promise<string>;

  /**
   * Insert multiple event records sequentially to the local event store database.
   *
   * This is a two step process, first step validates and inserts each event in
   * a commit transaction. Once the commit is successfull the second step projects
   * the inserted records.
   *
   * @param records - List of event records to process.
   */
  pushEventSequence(records: { record: TRecord; hydrated?: boolean }[]): Promise<void>;

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
   * Retrieve events from the events table under the given stream.
   *
   * @param stream  - Stream to retrieve events for.
   * @param options - Stream logic options. (Optional)
   */
  getEventsByStream(stream: string, options?: EventReadOptions<TRecord>): Promise<TRecord[]>;

  /**
   * Retrieve all events under the given context key.
   *
   * @param key     - Context key to retrieve events for.
   * @param options - Context logic options. (Optional)
   */
  getEventsByContext(key: string, options?: EventReadOptions<TRecord>): Promise<TRecord[]>;

  /**
   * Retrieves a list of events, and runs them through context, and projection
   * subcribers. This is usefull for when projections, or contexts has been updated
   * or added.
   *
   * When no stream is provided, the entire event store is replayed.
   *
   * @param stream - Stream to replay events for. (Optional)
   */
  replayEvents(stream?: string): Promise<void>;

  /*
   |--------------------------------------------------------------------------------
   | Reducers
   |--------------------------------------------------------------------------------
   */

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
    config: ReducerConfig<TRecord>,
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
   * const reducer = makeAggregateReducer(Foo, {
   *   name: "foo-aggregate",
   *   type: "stream"
   * });
   *
   * const foo = await eventStore.reduce("stream-id", reducer);
   * ```
   */
  makeAggregateReducer<TAggregateRoot extends typeof AggregateRoot<TRecord>>(
    aggregate: TAggregateRoot,
    config: ReducerConfig<TRecord>,
  ): Reducer<TRecord, InstanceType<TAggregateRoot>>;

  /**
   * Reduce events in the given stream to a entity state.
   *
   * @param streamOrContext - Stream, or Context to get events from.
   * @param reducer         - Reducer method to generate state from.
   *
   * @example
   * ```ts
   * const state = await eventStore.reduce(stream, reducer);
   * ```
   *
   * @example
   * ```ts
   * const state = await eventStore.reduce(`foo:${foo}:bars`, reducer);
   * ```
   *
   * Reducers are created through the `.makeReducer` method.
   */
  reduce<TReducer extends Reducer>(
    streamOrContext: string,
    reducer: TReducer,
  ): Promise<ReturnType<TReducer["reduce"]> | undefined>;

  /*
   |--------------------------------------------------------------------------------
   | Snapshots
   |--------------------------------------------------------------------------------
   */

  /**
   * Create a new snapshot for the given stream/context and reducer.
   *
   * @param streamOrContext - Stream, or Context to create a snapshot from.
   * @param reduce          - Reducer method to create the snapshot state from.
   *
   * @example
   * ```ts
   * await eventStore.createSnapshot(stream, reducer);
   * ```
   *
   * @example
   * ```ts
   * await eventStore.createSnapshot(`foo:${foo}:bars`, reducer);
   * ```
   */
  createSnapshot<TReducer extends Reducer>(streamOrContext: string, reduce: TReducer): Promise<void>;

  /**
   * Get an entity state snapshot from the database. These are useful for when we
   * want to reduce the amount of events that has to be processed when fetching
   * state history for a reducer.
   *
   * @param streamOrContext - Stream, or Context to get snapshot for.
   * @param reducer         - Reducer to get snapshot for.
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
   * @param streamOrContext - Stream, or Context to delete snapshot for.
   * @param reducer         - Reducer to remove snapshot for.
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
   * Before an error is thrown, this hook allows for customizing the error that
   * is thrown. This is useful for when you want to throw a different error that
   * more complies with your project setup.
   *
   * @param error  - Event error that got triggered.
   * @param record - Record that was passed to the event store.
   *
   * @example
   * ```ts
   * const eventStore = new EventStore({
   *   ...config,
   *   hooks: {
   *     beforeEventError(error) {
   *       if (error.step === "validation") {
   *         return new ServerError(error.message);
   *       }
   *       return error;
   *     }
   *   }
   * })
   * ```
   */
  beforeEventError(error: PreEventInsertError, record: TRecord): Promise<Error | unknown>;

  /**
   * After an error is thrown, this hook allows for reacting to a failure that
   * occured during event record insertion. This is useful for reporting issues,
   * especially in the events that failed to project or update contexts.
   *
   * @param error  - Event error that got triggered.
   * @param record - Record that was passed to the event store.
   *
   * @example
   * ```ts
   * const eventStore = new EventStore({
   *   ...config,
   *   hooks: {
   *     async afterEventError(error, record) {
   *       if (error.step === "project") {
   *         await report.projectionFailed(
   *          `Failed to project record '${record.stream}', manual recovery required!`
   *         );
   *       }
   *     }
   *   }
   * })
   * ```
   */
  afterEventError(error: PostEventInsertError, record: TRecord): Promise<void> | void;

  /**
   * After an event record has been successfully inserted, this hooks will
   * trigger, allowing for further non internal operations on the inserted
   * event record.
   *
   * @param record   - Record that was inserted.
   * @param hydrated - Hydrated state of the record.
   */
  afterEventInsert(record: TRecord, hydrated: boolean): Promise<void> | void;
}>;

/*
 |--------------------------------------------------------------------------------
 | Query Types
 |--------------------------------------------------------------------------------
 */

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
   * Fetch events from a specific point in time. The direction of which
   * events are fetched is determined by the direction option.
   */
  cursor?: string;

  /**
   * Fetch events in ascending or descending order. Default: "asc"
   */
  direction?: "asc" | "desc";
};

export type Pagination = CursorPagination | OffsetPagination;

export type CursorPagination = {
  /**
   * Fetches streams from the specific cursor. Cursor value represents
   * a stream id.
   */
  cursor: string;

  /**
   * Fetch streams in ascending or descending order.
   */
  direction: 1 | -1;
};

export type OffsetPagination = {
  /**
   * Fetch streams from the specific offset.
   */
  offset: number;

  /**
   * Limit the number of streams to return.
   */
  limit: number;
};
