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
 * import { z } from "@valkyr/event-store";
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

import { Contextor } from "~libraries/contextor.ts";
import { createEventRecord } from "~libraries/event.ts";
import { Projector } from "~libraries/projector.ts";
import { makeReducer } from "~libraries/reducer.ts";
import { Validator } from "~libraries/validator.ts";
import type { Unknown } from "~types/common.ts";
import type { Event, EventRecord, EventStatus, EventToRecord } from "~types/event.ts";
import type { EventReadOptions, EventStore, EventStoreHooks } from "~types/event-store.ts";
import type { InferReducerState, Reducer, ReducerConfig, ReducerLeftFold } from "~types/reducer.ts";
import type { ExcludeEmptyFields } from "~types/utilities.ts";
import { pushEventRecord } from "~utilities/event-store/push-event-record.ts";

import { type Adapter, type Collections, getEventStoreDatabase } from "./database.ts";
import { ContextProvider } from "./providers/context.ts";
import { EventProvider } from "./providers/event.ts";
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
export class ValkyrEventStore<TEvent extends Event, TRecord extends EventRecord = EventToRecord<TEvent>> implements EventStore<TEvent, TRecord> {
  readonly #database: IndexedDatabase<Collections>;
  readonly #events: EventList<TEvent>;
  readonly #validators: ValidatorConfig<TEvent>;
  readonly #snapshot: "manual" | "auto";

  readonly hooks: EventStoreHooks<TRecord>;

  readonly events: EventProvider<TRecord>;
  readonly contexts: ContextProvider;
  readonly snapshots: SnapshotProvider;

  readonly validator: Validator<TRecord>;
  readonly projector: Projector<TRecord>;
  readonly contextor: Contextor<TRecord>;

  constructor(config: Config<TEvent, TRecord>) {
    this.#database = getEventStoreDatabase(config.name ?? "valkyr:event-store", config.database) as IndexedDatabase<Collections>;
    this.#events = config.events;
    this.#validators = config.validators;
    this.#snapshot = config.snapshot ?? "manual";

    this.hooks = config.hooks ?? {};

    this.events = new EventProvider(this.#database.collection("events"));
    this.contexts = new ContextProvider(this.#database.collection("contexts"));
    this.snapshots = new SnapshotProvider(this.#database.collection("snapshots"));

    this.validator = new Validator<TRecord>();
    this.projector = new Projector<TRecord>();
    this.contextor = new Contextor<TRecord>(this.contexts.handle.bind(this.contexts));
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  /**
   * @valkyr/db 'events' collection instance which can be accessed to read events
   * data directly from the persisted event store.
   */
  get db(): IndexedDatabase<Collections> {
    return this.#database;
  }

  /*
   |--------------------------------------------------------------------------------
   | Events
   |--------------------------------------------------------------------------------
   */

  hasEvent(type: TRecord["type"]): boolean {
    return this.#events.has(type);
  }

  async addEvent<TEventType extends Event["type"]>(
    event: ExcludeEmptyFields<Extract<TEvent, { type: TEventType }>> & { stream?: string },
  ): Promise<string> {
    return this.pushEvent(createEventRecord(event as any) as TRecord, false);
  }

  async addEventSequence<TEventType extends Event["type"]>(
    _events: (ExcludeEmptyFields<Extract<TEvent, { type: TEventType }>> & { stream: string })[],
  ): Promise<void> {
    throw new Error("Method 'addEventSequence' not yet supported in @valkyr/db driver");
  }

  async pushEvent(record: TRecord, hydrated = true): Promise<string> {
    return pushEventRecord(this as any, record, hydrated);
  }

  async pushEventSequence(_records: { record: TRecord; hydrated?: boolean }[]): Promise<void> {
    throw new Error("Method 'pushEventSequence' not yet supported in @valkyr/db driver");
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

  async getEventsByStream(stream: string, options?: EventReadOptions<TRecord>): Promise<TRecord[]> {
    return (await this.events.getByStream(stream, options)) as TRecord[];
  }

  async getEventsByContext(key: string, options?: EventReadOptions<TRecord>): Promise<TRecord[]> {
    const rows = await this.contexts.getByKey(key);
    if (rows.length === 0) {
      return [];
    }
    return (await this.events.getByStreams(rows.map((row) => row.stream), options)) as TRecord[];
  }

  async replayEvents(stream?: string): Promise<void> {
    const events = stream !== undefined ? await this.events.getByStream(stream) : await this.events.get();
    for (const event of events) {
      await Promise.all([
        this.contextor.push(event),
        this.projector.project(event, { hydrated: true, outdated: false }),
      ]);
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Reducers
   |--------------------------------------------------------------------------------
   */

  makeReducer<TState extends Unknown>(
    folder: ReducerLeftFold<TState, TRecord>,
    config: ReducerConfig<TState, TRecord>,
  ): Reducer<TState, TRecord> {
    return makeReducer<TState, TRecord>(folder, config);
  }

  async reduce<TReducer extends Reducer>(
    streamOrContext: string,
    reducer: TReducer,
  ): Promise<ReturnType<TReducer["reduce"]> | undefined> {
    let cursor: string | undefined;
    let state: InferReducerState<TReducer> | undefined;

    const snapshot = await this.getSnapshot(streamOrContext, reducer);
    if (snapshot !== undefined) {
      cursor = snapshot.cursor;
      state = snapshot.state;
    }

    const events = reducer.type === "stream"
      ? await this.getEventsByStream(streamOrContext, { cursor, filter: reducer.filter })
      : await this.getEventsByContext(streamOrContext, { cursor, filter: reducer.filter });
    if (events.length === 0) {
      if (snapshot !== undefined) {
        return snapshot.state;
      }
      return undefined;
    }

    const result = reducer.reduce(events, state);
    if (this.#snapshot === "auto") {
      await this.snapshots.insert(name, streamOrContext, events.at(-1)!.created, result);
    }
    return result;
  }

  /*
   |--------------------------------------------------------------------------------
   | Snapshots
   |--------------------------------------------------------------------------------
   */

  async createSnapshot<TReducer extends Reducer>(streamOrContext: string, { name, type, filter, reduce }: TReducer): Promise<void> {
    const events = type === "stream" ? await this.getEventsByStream(streamOrContext, { filter }) : await this.getEventsByContext(streamOrContext, { filter });
    if (events.length === 0) {
      return undefined;
    }
    await this.snapshots.insert(name, streamOrContext, events.at(-1)!.created, reduce(events));
  }

  async getSnapshot<TReducer extends Reducer, TState = InferReducerState<TReducer>>(
    streamOrContext: string,
    reducer: TReducer,
  ): Promise<{ cursor: string; state: TState } | undefined> {
    const snapshot = await this.snapshots.getByStream(reducer.name, streamOrContext);
    if (snapshot === undefined) {
      return undefined;
    }
    return { cursor: snapshot.cursor, state: snapshot.state as TState };
  }

  async deleteSnapshot<TReducer extends Reducer>(streamOrContext: string, reducer: TReducer): Promise<void> {
    await this.snapshots.remove(reducer.name, streamOrContext);
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

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
