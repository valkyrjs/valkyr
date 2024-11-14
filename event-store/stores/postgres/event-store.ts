/**
 * @module
 *
 * This module contains an event store solution for postgres.
 *
 * @example
 * ```ts
 * import psql from "postgres";
 *
 * import { PGEventStore } from "@valkyr/event-store/pg";
 * import { z } from "zod";
 *
 * const eventStore = new PGEventStore<MyEvents>({
 *   database: "postgres://{user}:{password}@{url}:{port}/{database}",
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

import { type PostgresConnection, PostgresDatabase } from "@valkyr/drizzle";
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

import { type EventStoreSchema, schema, type Transaction } from "./database.ts";
import { EventProvider } from "./providers/event.ts";
import { RelationsProvider } from "./providers/relations.ts";
import { SnapshotProvider } from "./providers/snapshot.ts";
import { events } from "./schemas/events.ts";
import { relations } from "./schemas/relations.ts";
import { snapshots } from "./schemas/snapshots.ts";

export { migrate } from "./database.ts";
export { journal } from "./migrations/journal.ts";

/*
 |--------------------------------------------------------------------------------
 | Event Store
 |--------------------------------------------------------------------------------
 */

/**
 * Provides a solution to easily validate, generate, and project events to a
 * postgres database.
 */
export class PostgresEventStore<TEvent extends Event, TRecord extends EventRecord = EventToRecord<TEvent>> implements EventStore<TEvent, TRecord> {
  readonly #database: PostgresDatabase<EventStoreSchema>;
  readonly #events: EventList<TEvent>;
  readonly #validators: ValidatorConfig<TEvent>;
  readonly #snapshot: "manual" | "auto";
  readonly #hooks: EventStoreHooks<TRecord>;

  readonly relations: RelationsProvider;
  readonly events: EventProvider<TRecord>;
  readonly snapshots: SnapshotProvider;

  constructor(config: Config<TEvent, TRecord>, tx?: Transaction) {
    this.#database = new PostgresDatabase<EventStoreSchema>(config.database, schema);
    this.#events = config.events;
    this.#validators = config.validators;
    this.#snapshot = config.snapshot ?? "manual";
    this.#hooks = config.hooks ?? {};
    this.relations = new RelationsProvider(tx ?? this.#database, relations);
    this.events = new EventProvider(tx ?? this.#database, events);
    this.snapshots = new SnapshotProvider(tx ?? this.#database, snapshots);
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
    await this.pushManyEvents(events.map((event) => createEventRecord<TEvent, TRecord>(event as any)), settings);
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
    const events: TRecord[] = [];
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
    return this.events.get(options);
  }

  async getEventsByStreams(stream: string[], options?: EventReadOptions<TRecord>): Promise<TRecord[]> {
    return this.events.getByStreams(stream, options);
  }

  async getEventsByRelations(keys: string[], options?: EventReadOptions<TRecord>): Promise<TRecord[]> {
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

  makeReducer<TState extends Unknown>(
    foldFn: ReducerLeftFold<TState, TRecord>,
    name: string,
    stateFn: ReducerState<TState>,
  ): Reducer<TRecord, TState> {
    return makeReducer<TRecord, TState>(foldFn, name, stateFn);
  }

  makeAggregateReducer<TAggregateRoot extends typeof AggregateRoot<TRecord>>(
    aggregate: TAggregateRoot,
    name: string,
  ): Reducer<TRecord, InstanceType<TAggregateRoot>> {
    return makeAggregateReducer<TRecord, TAggregateRoot>(aggregate, name);
  }

  async reduce<TReducer extends Reducer>(
    { stream, relation, reducer, ...query }: ReduceQuery<TRecord, TReducer>,
    pending: TRecord[] = [],
  ): Promise<ReturnType<TReducer["reduce"]> | undefined> {
    const id = stream ?? relation;

    query.direction = query.direction ?? "asc";

    let state: InferReducerState<TReducer> | undefined;

    const snapshot = await this.getSnapshot(id, reducer);
    if (snapshot !== undefined) {
      query.cursor = snapshot.cursor;
      state = snapshot.state;
    }

    const events = (stream !== undefined ? await this.getEventsByStreams([id], query) : await this.getEventsByRelations([id], query))
      .concat(pending);
    if (events.length === 0) {
      if (state !== undefined) {
        return reducer.from(state);
      }
      return undefined;
    }

    const result = reducer.reduce(events, state);
    if (this.#snapshot === "auto") {
      await this.snapshots.insert(reducer.name, id, events.at(-1)!.created, result);
    }
    return result;
  }

  /*
   |--------------------------------------------------------------------------------
   | Snapshots
   |--------------------------------------------------------------------------------
   */

  async createSnapshot<TReducer extends Reducer>({ stream, relation, reducer, ...query }: ReduceQuery<TRecord, TReducer>): Promise<void> {
    const id = stream ?? relation;
    const events = stream !== undefined ? await this.getEventsByStreams([id], query) : await this.getEventsByRelations([id], query);
    if (events.length === 0) {
      return undefined;
    }
    await this.snapshots.insert(reducer.name, id, events.at(-1)!.created, reducer.reduce(events));
  }

  async getSnapshot<TReducer extends Reducer, TState = InferReducerState<TReducer>>(
    streamOrRelation: string,
    reducer: TReducer,
  ): Promise<{ cursor: string; state: TState } | undefined> {
    const snapshot = await this.snapshots.getByStream(reducer.name, streamOrRelation);
    if (snapshot === undefined) {
      return undefined;
    }
    return { cursor: snapshot.cursor, state: snapshot.state as TState };
  }

  async deleteSnapshot<TReducer extends Reducer>(streamOrRelation: string, reducer: TReducer): Promise<void> {
    await this.snapshots.remove(reducer.name, streamOrRelation);
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
  database: PostgresConnection;
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
