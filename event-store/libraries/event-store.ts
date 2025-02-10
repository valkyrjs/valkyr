/**
 * @module
 *
 * This module contains an abstract event store solution that can take a variety of
 * provider adapters to support multiple storage drivers.
 *
 * @example
 * ```ts
 * import { EventStore } from "@valkyr/event-store";
 * import { z } from "zod";
 *
 * const eventStore = new EventStore<Event>({
 *   adapter: {
 *     providers: {
 *       event: new EventProvider(db),
 *       relations: new RelationsProvider(db),
 *       snapshot: new SnapshotProvider(db),
 *     },
 *   },
 *   events: Set<[
 *     "EventA",
 *     "EventB"
 *   ] as const>,
 *   validators: new Map<MyEvents["type"], any>([
 *     ["EventA", z.object({ foo: z.string() }).strict()],
 *     ["EventB", z.object({ bar: z.string() }).strict()],
 *   ]),
 * });
 *
 * type MyEvents = EventA | EventB;
 *
 * type EventA = Event<"EventA", { foo: string }, { domain: string }>;
 * type EventB = Event<"EventB", { bar: string }, { domain: string }>;
 * ```
 */

import type { AnyZodObject } from "zod";

import type { AggregateRoot } from "~libraries/aggregate.ts";
import { EventInsertionError, EventMissingError, EventParserError } from "~libraries/errors.ts";
import { makeEventRecord } from "~libraries/event.ts";
import { makeAggregateReducer, makeReducer } from "~libraries/reducer.ts";
import type { Unknown } from "~types/common.ts";
import type { Event, EventStatus, EventToRecord } from "~types/event.ts";
import type {
  EventList,
  EventReadOptions,
  EventsInsertSettings,
  EventStoreAdapter,
  EventStoreConfig,
  EventStoreHooks,
  ReduceQuery,
  ValidatorConfig,
} from "~types/event-store.ts";
import type { InferReducerState, Reducer, ReducerLeftFold, ReducerState } from "~types/reducer.ts";
import type { ExcludeEmptyFields } from "~types/utilities.ts";

/*
 |--------------------------------------------------------------------------------
 | Event Store
 |--------------------------------------------------------------------------------
 */

/**
 * Provides a common interface to interact with a event storage solution. Its built
 * on an adapter pattern to allow for multiple different storage drivers.
 */
export class EventStore<const TEvent extends Event, TEventStoreAdapter extends EventStoreAdapter<TEvent> = EventStoreAdapter<TEvent>> {
  readonly #adapter: TEventStoreAdapter;
  readonly #events: EventList<TEvent>;
  readonly #validators: ValidatorConfig<TEvent>;
  readonly #snapshot: "manual" | "auto";
  readonly #hooks: EventStoreHooks<TEvent>;

  constructor(config: EventStoreConfig<TEvent, TEventStoreAdapter>) {
    this.#adapter = config.adapter;
    this.#events = config.events;
    this.#validators = config.validators;
    this.#snapshot = config.snapshot ?? "manual";
    this.#hooks = config.hooks ?? {};
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get eventTypes(): string[] {
    return Array.from(this.#events);
  }

  get events(): TEventStoreAdapter["providers"]["events"] {
    return this.#adapter.providers.events;
  }

  get relations(): TEventStoreAdapter["providers"]["relations"] {
    return this.#adapter.providers.relations;
  }

  get snapshots(): TEventStoreAdapter["providers"]["snapshots"] {
    return this.#adapter.providers.snapshots;
  }

  /*
   |--------------------------------------------------------------------------------
   | Event Handlers
   |--------------------------------------------------------------------------------
   */

  onEventsInserted(fn: EventStoreHooks<TEvent>["onEventsInserted"]) {
    this.#hooks.onEventsInserted = fn;
  }

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
  hasEvent(type: TEvent["type"]): boolean {
    return this.#events.has(type);
  }

  /**
   * Make a new event.
   *
   * This simply creates a new compatible event object that can be added to the
   * store at a later time.
   *
   * @param event  - Event data to make.
   * @param stream - Pre-existing stream to attach the event to.
   */
  makeEvent(event: ExcludeEmptyFields<TEvent> & { stream?: string }): EventToRecord<TEvent> {
    return makeEventRecord<TEvent>(event as any);
  }

  /**
   * Add a new event to the events table.
   *
   * @param event    - Event data to record.
   * @param settings - Event settings which can modify insertion behavior.
   */
  async addEvent(
    event: ExcludeEmptyFields<TEvent> & {
      stream?: string;
    },
    settings: EventsInsertSettings = {},
  ): Promise<void> {
    await this.pushEvent(makeEventRecord<TEvent>(event as any), settings);
  }

  /**
   * Add many events in strict sequence to the events table.
   *
   * This method runs in a transaction and will fail all events if one or more
   * insertion failures occurs.
   *
   * @param events   - List of events to record.
   * @param settings - Event settings which can modify insertion behavior.
   */
  async addManyEvents(
    events: (ExcludeEmptyFields<TEvent> & { stream: string })[],
    settings: EventsInsertSettings = {},
  ): Promise<void> {
    await this.pushManyEvents(events.map((event) => makeEventRecord<TEvent>(event as any)), settings);
  }

  /**
   * Insert an event record to the local event store database.
   *
   * @param record   - Event record to insert.
   * @param settings - Event settings which can modify insertion behavior.
   */
  async pushEvent(record: EventToRecord<TEvent>, settings: EventsInsertSettings = {}): Promise<void> {
    if (this.hasEvent(record.type) === false) {
      throw new EventMissingError(record.type);
    }
    await this.parseEventRecord(record);
    await this.events.insert(record).catch((error) => {
      throw new EventInsertionError(error.message);
    });
    await this.#hooks.onEventsInserted?.([record], settings).catch(this.#hooks.onError ?? console.error);
  }

  /**
   * Add many events in strict sequence to the events table.
   *
   * This method runs in a transaction and will fail all events if one or more
   * insertion failures occurs.
   *
   * @param records  - List of event records to insert.
   * @param settings - Event settings which can modify insertion behavior.
   */
  async pushManyEvents(records: EventToRecord<TEvent>[], settings: EventsInsertSettings = {}): Promise<void> {
    const events: EventToRecord<TEvent>[] = [];
    for (const record of records) {
      if (this.hasEvent(record.type) === false) {
        throw new EventMissingError(record.type);
      }
      await this.parseEventRecord(record);
      events.push(record);
    }
    await this.events.insertMany(events).catch((error) => {
      throw new EventInsertionError(error.message);
    });
    await this.#hooks.onEventsInserted?.(events, settings).catch(this.#hooks.onError ?? console.error);
  }

  /**
   * Takes in an aggregate and commits any pending events to the event store.
   *
   * @param aggregate - Aggregate to push events from.
   * @param settings  - Event settings which can modify insertion behavior.
   */
  async pushAggregate(aggregate: AggregateRoot<TEvent>, settings?: EventsInsertSettings): Promise<void> {
    await aggregate.commit(this, settings);
  }

  /**
   * Takes a list of aggregates and commits any pending events to the event store.
   * Events are committed in order so its important to ensure that the aggregates
   * are placed in the correct index position of the array.
   *
   * This method allows for a simpler way to commit many events over many
   * aggregates in a single transaction. Ensuring atomicity of a larger group
   * of events.
   *
   * @param aggregates - Aggregates to push events from.
   * @param settings   - Event settings which can modify insertion behavior.
   */
  async pushManyAggregates(aggregates: AggregateRoot<TEvent>[], settings?: EventsInsertSettings): Promise<void> {
    const events: EventToRecord<TEvent>[] = [];
    for (const aggregate of aggregates) {
      events.push(...aggregate.toPending());
    }
    await this.pushManyEvents(events, settings);
    for (const aggregate of aggregates) {
      aggregate.flush();
    }
  }

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
  async getEventStatus(event: EventToRecord<TEvent>): Promise<EventStatus> {
    const record = await this.events.getById(event.id);
    if (record) {
      return { exists: true, outdated: true };
    }
    return { exists: false, outdated: await this.events.checkOutdated(event) };
  }

  /**
   * Retrieve events from the events table.
   *
   * @param options - Read options. (Optional)
   */
  async getEvents(options?: EventReadOptions<TEvent>): Promise<EventToRecord<TEvent>[]> {
    return this.events.get(options);
  }

  /**
   * Retrieve events from the events table under the given streams.
   *
   * @param streams - Streams to retrieve events for.
   * @param options - Read options to pass to the provider. (Optional)
   */
  async getEventsByStreams(streams: string[], options?: EventReadOptions<TEvent>): Promise<EventToRecord<TEvent>[]> {
    return this.events.getByStreams(streams, options);
  }

  /**
   * Retrieve all events under the given relational keys.
   *
   * @param keys    - Relational keys to retrieve events for.
   * @param options - Relational logic options. (Optional)
   */
  async getEventsByRelations(keys: string[], options?: EventReadOptions<TEvent>): Promise<EventToRecord<TEvent>[]> {
    const streamIds = await this.relations.getByKeys(keys);
    if (streamIds.length === 0) {
      return [];
    }
    return this.events.getByStreams(streamIds, options);
  }

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
   * const reducer = eventStore.makeReducer<{ name: string }>((state, event) => {
   *   switch (event.type) {
   *     case "FooCreated": {
   *       state.name = event.data.name;
   *       break;
   *     }
   *   }
   *   return state;
   * }, () => ({
   *   name: ""
   * }));
   *
   * const state = await eventStore.reduce({ name: "foo:reducer", stream: "stream-id", reducer });
   * ```
   */
  makeReducer<TState extends Unknown>(
    foldFn: ReducerLeftFold<TState, TEvent>,
    stateFn: ReducerState<TState>,
  ): Reducer<TEvent, TState> {
    return makeReducer<TEvent, TState>(foldFn, stateFn);
  }

  /**
   * Make a new event reducer based on the events registered with the event store.
   *
   * @param aggregate - Aggregate class to create instance from.
   *
   * @example
   * ```ts
   * class Foo extends AggregateRoot<Event> {
   *   name: string = "";
   *
   *   static #reducer = makeAggregateReducer(Foo);
   *
   *   static async getById(fooId: string): Promise<Foo | undefined> {
   *     return eventStore.reduce({
   *       name: "foo",
   *       stream: "stream-id",
   *       reducer: this.#reducer,
   *     });
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
   * ```
   */
  makeAggregateReducer<TAggregateRoot extends typeof AggregateRoot<TEvent>>(
    aggregate: TAggregateRoot,
  ): Reducer<TEvent, InstanceType<TAggregateRoot>> {
    return makeAggregateReducer<TEvent, TAggregateRoot>(aggregate);
  }

  /**
   * Reduce events in the given stream to a entity state.
   *
   * @param query   - Reducer query to resolve event state from.
   * @param pending - List of non comitted events to append to the server events.
   *
   * @example
   *
   * ```ts
   * const state = await eventStore.reduce({ stream, reducer });
   * ```
   *
   * @example
   *
   * ```ts
   * const state = await eventStore.reduce({ relation: `foo:${foo}:bars`, reducer });
   * ```
   *
   * Reducers are created through the `.makeReducer` and `.makeAggregateReducer` method.
   */
  async reduce<TReducer extends Reducer>(
    { name, stream, relation, reducer, ...query }: ReduceQuery<TEvent, TReducer>,
    pending: EventToRecord<TEvent>[] = [],
  ): Promise<ReturnType<TReducer["reduce"]> | undefined> {
    const id = stream ?? relation;

    let state: InferReducerState<TReducer> | undefined;
    let cursor: string | undefined;

    const snapshot = await this.getSnapshot(name, id);
    if (snapshot !== undefined) {
      cursor = snapshot.cursor;
      state = snapshot.state;
    }

    const events = (stream !== undefined ? await this.getEventsByStreams([id], { ...query, cursor }) : await this.getEventsByRelations([id], { ...query, cursor }))
      .concat(pending);
    if (events.length === 0) {
      if (state !== undefined) {
        return reducer.from(state);
      }
      return undefined;
    }

    const result = reducer.reduce(events, state);
    if (this.#snapshot === "auto") {
      await this.snapshots.insert(name, id, events.at(-1)!.created, result);
    }
    return result;
  }

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
  async createSnapshot<TReducer extends Reducer>({ name, stream, relation, reducer, ...query }: ReduceQuery<TEvent, TReducer>): Promise<void> {
    const id = stream ?? relation;
    const events = stream !== undefined ? await this.getEventsByStreams([id], query) : await this.getEventsByRelations([id], query);
    if (events.length === 0) {
      return undefined;
    }
    await this.snapshots.insert(name, id, events.at(-1)!.created, reducer.reduce(events));
  }

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
   * const snapshot = await eventStore.getSnapshot("foo:reducer", stream);
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
   * const snapshot = await eventStore.getSnapshot("foo:reducer", `foo:${foo}:bars`);
   * console.log(snapshot);
   * // {
   * //   cursor: "jxubdY-0",
   * //   state: {
   * //     count: 1
   * //   }
   * // }
   * ```
   */
  async getSnapshot<TReducer extends Reducer, TState = InferReducerState<TReducer>>(
    name: string,
    streamOrRelation: string,
  ): Promise<{ cursor: string; state: TState } | undefined> {
    const snapshot = await this.snapshots.getByStream(name, streamOrRelation);
    if (snapshot === undefined) {
      return undefined;
    }
    return { cursor: snapshot.cursor, state: snapshot.state as TState };
  }

  /**
   * Delete a snapshot.
   *
   * @param streamOrRelation - Stream, or Relation to delete snapshot for.
   * @param reducer          - Reducer to remove snapshot for.
   *
   * @example
   * ```ts
   * await eventStore.deleteSnapshot("foo:reducer", stream);
   * ```
   *
   * @example
   * ```ts
   * await eventStore.deleteSnapshot("foo:reducer", `foo:${foo}:bars`);
   * ```
   */
  async deleteSnapshot(name: string, streamOrRelation: string): Promise<void> {
    await this.snapshots.remove(name, streamOrRelation);
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  /**
   * Check provided record against its type validators for incoming data and meta
   * information. If the check fails an EventDataValidationError is thrown.
   *
   * @param record - Record to validate.
   */
  async parseEventRecord(record: EventToRecord<TEvent>) {
    const { data, meta } = this.getValidator(record.type);
    if (data !== undefined || meta !== undefined) {
      const errors = [];
      if (data !== undefined) {
        const result = await data.safeParseAsync(record.data);
        if (result.success === false) {
          errors.push(result.error.flatten().fieldErrors);
        }
      }
      if (meta !== undefined) {
        const result = await meta.safeParseAsync(record.meta);
        if (result.success === false) {
          errors.push(result.error.flatten().fieldErrors);
        }
      }
      if (errors.length > 0) {
        throw new EventParserError(errors);
      }
    }
  }

  /**
   * Get a zod event validator instance used to check if an event object matches
   * the expected definitions.
   *
   * @param type - Event to get validator for.
   */
  getValidator(type: TEvent["type"]): {
    data?: AnyZodObject;
    meta?: AnyZodObject;
  } {
    return {
      data: this.#validators.data.get(type),
      meta: this.#validators.meta.get(type),
    };
  }
}
