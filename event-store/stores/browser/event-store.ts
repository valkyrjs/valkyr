/**
 * @module
 *
 * This module contains an event store solution for postgres.
 *
 * @example
 * ```ts
 * import { Database } from "sqlite";
 *
 * import { ValkyrEventStore } from "@valkyr/event-store/valkyr";
 * import { z } from "zod";
 *
 * const eventStore = new ValkyrEventStore<MyEvents>({
 *   database: "memorydb",
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

import type { IndexedDatabase } from "@valkyr/db";
import type { AnyZodObject } from "zod";

import type { AggregateRoot } from "~libraries/aggregate.ts";
import { EventInsertionError, EventMissingError, EventParserError } from "~libraries/errors.ts";
import { createEventRecord } from "~libraries/event.ts";
import { makeAggregateReducer, makeReducer } from "~libraries/reducer.ts";
import type { Unknown } from "~types/common.ts";
import type { Event, EventRecord, EventStatus, EventToRecord } from "~types/event.ts";
import type { EventReadOptions, EventsInsertSettings, EventStore, EventStoreHooks, ReduceQuery } from "~types/event-store.ts";
import type { InferReducerState, Reducer, ReducerLeftFold, ReducerState } from "~types/reducer.ts";
import type { ExcludeEmptyFields } from "~types/utilities.ts";

import { type Adapter, type Collections, getEventStoreDatabase } from "./database.ts";
import { EventProvider } from "./providers/event.ts";
import { RelationsProvider } from "./providers/relations.ts";
import { SnapshotProvider } from "./providers/snapshot.ts";

/*
 |--------------------------------------------------------------------------------
 | Event Store
 |--------------------------------------------------------------------------------
 */

/**
 * Provides a solution to easily validate, generate, and project events to a
 * valkyr database.
 */
export class BrowserEventStore<TEvent extends Event, TRecord extends EventRecord = EventToRecord<TEvent>> implements EventStore<TEvent, TRecord> {
  readonly #database: IndexedDatabase<Collections>;
  readonly #events: EventList<TEvent>;
  readonly #validators: ValidatorConfig<TEvent>;
  readonly #snapshot: "manual" | "auto";
  readonly #hooks: EventStoreHooks<TRecord>;

  readonly events: EventProvider<TRecord>;
  readonly relations: RelationsProvider;
  readonly snapshots: SnapshotProvider;

  constructor(config: Config<TEvent, TRecord>) {
    this.#database = getEventStoreDatabase(config.name ?? "valkyr:event-store", config.database) as IndexedDatabase<Collections>;
    this.#events = config.events;
    this.#validators = config.validators;
    this.#snapshot = config.snapshot ?? "manual";
    this.#hooks = config.hooks ?? {};
    this.events = new EventProvider(this.#database.collection("events"));
    this.relations = new RelationsProvider(this.#database.collection("relations"));
    this.snapshots = new SnapshotProvider(this.#database.collection("snapshots"));
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get eventTypes(): string[] {
    return Array.from(this.#events);
  }

  /*
   |--------------------------------------------------------------------------------
   | Event Handlers
   |--------------------------------------------------------------------------------
   */

  onEventsInserted(fn: EventStoreHooks<TRecord>["onEventsInserted"]) {
    this.#hooks.onEventsInserted = fn;
  }

  /*
   |--------------------------------------------------------------------------------
   | Events
   |--------------------------------------------------------------------------------
   */

  hasEvent(type: TRecord["type"]): boolean {
    return this.#events.has(type);
  }

  makeEvent<TEventType extends Event["type"]>(
    event: ExcludeEmptyFields<Extract<TEvent, { type: TEventType }>> & {
      stream?: string;
    },
  ): TRecord {
    return createEventRecord<TEvent, TRecord>(event as any);
  }

  async addEvent<TEventType extends Event["type"]>(
    event: ExcludeEmptyFields<Extract<TEvent, { type: TEventType }>> & {
      stream?: string;
    },
    settings: EventsInsertSettings = {},
  ): Promise<void> {
    await this.pushEvent(createEventRecord<TEvent, TRecord>(event as any), settings);
  }

  async addManyEvents<TEventType extends Event["type"]>(
    events: (ExcludeEmptyFields<Extract<TEvent, { type: TEventType }>> & { stream: string })[],
    settings: EventsInsertSettings = {},
  ): Promise<void> {
    return this.pushManyEvents(events.map((event) => createEventRecord<TEvent, TRecord>(event as any)), settings);
  }

  async pushEvent(record: TRecord, settings: EventsInsertSettings = {}): Promise<void> {
    if (this.hasEvent(record.type) === false) {
      throw new EventMissingError(record.type);
    }
    await this.parseEventRecord(record);
    await this.events.insert(record).catch((error) => {
      throw new EventInsertionError(error.message);
    });
    await this.#hooks.onEventsInserted?.([record], settings).catch(this.#hooks.onError ?? console.error);
  }

  async pushManyEvents(records: TRecord[], settings: EventsInsertSettings = {}): Promise<void> {
    const events = [];
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

  async getEventStatus(event: TRecord): Promise<EventStatus> {
    const record = await this.events.getById(event.id);
    if (record) {
      return { exists: true, outdated: true };
    }
    return { exists: false, outdated: await this.events.checkOutdated(event) };
  }

  async getEvents(options?: EventReadOptions<TRecord>): Promise<TRecord[]> {
    return (await this.events.get(options)) as TRecord[];
  }

  async getEventsByStreams(streams: string[], options?: EventReadOptions<TRecord>): Promise<TRecord[]> {
    return (await this.events.getByStreams(streams, options)) as TRecord[];
  }

  async getEventsByRelations(keys: string[], options?: EventReadOptions<TRecord>): Promise<TRecord[]> {
    const streamIds = await this.relations.getByKeys(keys);
    if (streamIds.length === 0) {
      return [];
    }
    return (await this.events.getByStreams(streamIds, options)) as TRecord[];
  }

  /*
   |--------------------------------------------------------------------------------
   | Reducers
   |--------------------------------------------------------------------------------
   */

  makeReducer<TState extends Unknown>(
    foldFn: ReducerLeftFold<TState, TRecord>,
    stateFn: ReducerState<TState>,
  ): Reducer<TRecord, TState> {
    return makeReducer<TRecord, TState>(foldFn, stateFn);
  }

  makeAggregateReducer<TAggregateRoot extends typeof AggregateRoot<TRecord>>(
    aggregate: TAggregateRoot,
  ): Reducer<TRecord, InstanceType<TAggregateRoot>> {
    return makeAggregateReducer<TRecord, TAggregateRoot>(aggregate);
  }

  async reduce<TReducer extends Reducer>(
    { name, stream, relation, reducer, ...query }: ReduceQuery<TRecord, TReducer>,
    pending: TRecord[] = [],
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

  async createSnapshot<TReducer extends Reducer>({ name, stream, relation, reducer, ...query }: ReduceQuery<TRecord, TReducer>): Promise<void> {
    const id = stream ?? relation;
    const events = stream !== undefined ? await this.getEventsByStreams([id], query) : await this.getEventsByRelations([id], query);
    if (events.length === 0) {
      return undefined;
    }
    await this.snapshots.insert(name, id, events.at(-1)!.created, reducer.reduce(events));
  }

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
  async parseEventRecord(record: TRecord) {
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
  getValidator(type: TRecord["type"]): {
    data?: AnyZodObject;
    meta?: AnyZodObject;
  } {
    return {
      data: this.#validators.data.get(type),
      meta: this.#validators.meta.get(type),
    };
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Config<TEvent extends Event, TRecord extends EventRecord> = {
  name?: string;
  database: Adapter;
  events: EventList<TEvent>;
  validators: ValidatorConfig<TEvent>;
  snapshot?: "manual" | "auto";
  hooks?: EventStoreHooks<TRecord>;
};

type ValidatorConfig<TEvent extends Event> = {
  data: Map<TEvent["type"], AnyZodObject>;
  meta: Map<TEvent["type"], AnyZodObject>;
};

type EventList<E extends Event> = Set<E["type"]>;
