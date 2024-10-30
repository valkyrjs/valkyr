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
import { Projector } from "~libraries/projector.ts";
import { makeAggregateReducer, makeReducer } from "~libraries/reducer.ts";
import { Relations } from "~libraries/relations.ts";
import { getLogicalTimestamp } from "~libraries/time.ts";
import type { Unknown } from "~types/common.ts";
import type { Event, EventRecord, EventStatus, EventToRecord } from "~types/event.ts";
import type { EventReadOptions, EventStore, EventStoreHooks } from "~types/event-store.ts";
import type { ProjectionStatus } from "~types/projector.ts";
import type { InferReducerState, Reducer, ReducerConfig, ReducerLeftFold, ReducerState } from "~types/reducer.ts";
import type { ExcludeEmptyFields } from "~types/utilities.ts";

import { type EventStoreSchema, schema, type Transaction } from "./database.ts";
import { EventProvider } from "./providers/event.ts";
import { RelationsProvider } from "./providers/relations.ts";
import { SnapshotProvider } from "./providers/snapshot.ts";
import { events } from "./schemas/events.ts";
import { relations } from "./schemas/relations.ts";
import { snapshots } from "./schemas/snapshots.ts";

export { migrate } from "./database.ts";

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

  readonly projector: Projector<TRecord>;
  readonly relations: Relations<TRecord>;

  readonly db: {
    readonly relations: RelationsProvider;
    readonly events: EventProvider<TRecord>;
    readonly snapshots: SnapshotProvider;
  };

  constructor(config: Config<TEvent, TRecord>, tx?: Transaction) {
    this.#database = new PostgresDatabase<EventStoreSchema>(config.database, schema);
    this.#events = config.events;
    this.#validators = config.validators;
    this.#snapshot = config.snapshot ?? "manual";
    this.#hooks = config.hooks ?? {};

    this.db = {
      relations: new RelationsProvider(tx ?? this.#database, relations),
      events: new EventProvider(tx ?? this.#database, events),
      snapshots: new SnapshotProvider(tx ?? this.#database, snapshots),
    };

    this.projector = new Projector<TRecord>();
    this.relations = new Relations<TRecord>(this.db.relations.handle.bind(this.db.relations));
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
  ): Promise<void> {
    await this.pushEvent(createEventRecord<TEvent, TRecord>(event as any), { hydrated: false, outdated: false });
  }

  async addManyEvents<TEventType extends Event["type"]>(
    events: (ExcludeEmptyFields<Extract<TEvent, { type: TEventType }>> & { stream: string })[],
  ): Promise<void> {
    await this.pushManyEvents(events.map((event) => ({
      record: createEventRecord<TEvent, TRecord>(event as any),
      status: {
        hydrated: false,
        outdated: false,
      },
    })));
  }

  async pushEvent(record: TRecord, status: ProjectionStatus): Promise<void> {
    if (this.hasEvent(record.type) === false) {
      throw new EventMissingError(record.type);
    }
    await this.parseEventRecord(record);
    if (status.hydrated === true) {
      record.recorded = getLogicalTimestamp();
    }
    await this.db.events.insert(record).catch((error) => {
      throw new EventInsertionError(error.message);
    });
    await Promise.all([
      this.projector.push(record, status).catch((error) => {
        if (this.#hooks.onProjectionError !== undefined) {
          this.#hooks.onProjectionError?.(error, record);
        } else {
          console.error({ error, record });
        }
      }),
      this.relations.push(record).catch((error) => {
        if (this.#hooks.onRelationsError !== undefined) {
          this.#hooks.onRelationsError?.(error, record);
        } else {
          console.error({ error, record });
        }
      }),
    ]);
  }

  async pushManyEvents(entries: { record: TRecord; status: ProjectionStatus }[]): Promise<void> {
    const events = [];
    for (const { record, status } of entries) {
      if (this.hasEvent(record.type) === false) {
        throw new EventMissingError(record.type);
      }
      await this.parseEventRecord(record);
      if (status.hydrated === true) {
        record.recorded = getLogicalTimestamp();
      }
      events.push(record);
    }
    await this.db.events.insertMany(events).catch((error) => {
      throw new EventInsertionError(error.message);
    });
    await Promise.all(
      entries.flatMap(({ record, status }) => [
        this.projector.push(record, status).catch((error) => {
          if (this.#hooks.onProjectionError !== undefined) {
            this.#hooks.onProjectionError?.(error, record);
          } else {
            console.error({ error, record });
          }
        }),
        this.relations.push(record).catch((error) => {
          if (this.#hooks.onRelationsError !== undefined) {
            this.#hooks.onRelationsError?.(error, record);
          } else {
            console.error({ error, record });
          }
        }),
      ]),
    );
  }

  async getEventStatus(event: TRecord): Promise<EventStatus> {
    const record = await this.db.events.getById(event.id);
    if (record) {
      return { exists: true, outdated: true };
    }
    return { exists: false, outdated: await this.db.events.checkOutdated(event) };
  }

  async getEvents(options?: EventReadOptions<TRecord>): Promise<TRecord[]> {
    return this.db.events.get(options);
  }

  async getEventsByStreams(stream: string[], options?: EventReadOptions<TRecord>): Promise<TRecord[]> {
    return this.db.events.getByStreams(stream, options);
  }

  async getEventsByRelations(keys: string[], options?: EventReadOptions<TRecord>): Promise<TRecord[]> {
    const streamIds = await this.db.relations.getByKeys(keys);
    if (streamIds.length === 0) {
      return [];
    }
    return this.db.events.getByStreams(streamIds, options);
  }

  async replay(records: TRecord[]): Promise<void> {
    await Promise.all(
      records.flatMap((record) => [
        this.projector.push(record, { hydrated: true, outdated: false }),
        this.relations.push(record),
      ]),
    );
  }

  /*
   |--------------------------------------------------------------------------------
   | Reducers
   |--------------------------------------------------------------------------------
   */

  makeReducer<TState extends Unknown>(
    foldFn: ReducerLeftFold<TState, TRecord>,
    config: ReducerConfig<TRecord>,
    stateFn: ReducerState<TState>,
  ): Reducer<TRecord, TState> {
    return makeReducer<TRecord, TState>(foldFn, config, stateFn);
  }

  makeAggregateReducer<TAggregateRoot extends typeof AggregateRoot<TRecord>>(
    aggregate: TAggregateRoot,
    config: ReducerConfig<TRecord>,
  ): Reducer<TRecord, InstanceType<TAggregateRoot>> {
    return makeAggregateReducer<TRecord, TAggregateRoot>(aggregate, config);
  }

  async reduce<TReducer extends Reducer>(
    streamOrRelation: string,
    reducer: TReducer,
    pending: TRecord[] = [],
  ): Promise<ReturnType<TReducer["reduce"]> | undefined> {
    let cursor: string | undefined;
    let state: InferReducerState<TReducer> | undefined;

    const snapshot = await this.getSnapshot(streamOrRelation, reducer);
    if (snapshot !== undefined) {
      cursor = snapshot.cursor;
      state = snapshot.state;
    }

    const events =
      (reducer.type === "stream"
        ? await this.getEventsByStreams([streamOrRelation], { cursor, filter: reducer.filter })
        : await this.getEventsByRelations([streamOrRelation], { cursor, filter: reducer.filter })).concat(pending);
    if (events.length === 0) {
      if (state !== undefined) {
        return reducer.from(state);
      }
      return undefined;
    }

    const result = reducer.reduce(events, state);
    if (this.#snapshot === "auto") {
      await this.db.snapshots.insert(name, streamOrRelation, events.at(-1)!.created, result);
    }
    return result;
  }

  /*
   |--------------------------------------------------------------------------------
   | Snapshots
   |--------------------------------------------------------------------------------
   */

  async createSnapshot<TReducer extends Reducer>(streamOrRelation: string, { name, type, filter, reduce }: TReducer): Promise<void> {
    const events = type === "stream"
      ? await this.getEventsByStreams([streamOrRelation], { filter })
      : await this.getEventsByRelations([streamOrRelation], { filter });
    if (events.length === 0) {
      return undefined;
    }
    await this.db.snapshots.insert(name, streamOrRelation, events.at(-1)!.created, reduce(events));
  }

  async getSnapshot<TReducer extends Reducer, TState = InferReducerState<TReducer>>(
    streamOrContext: string,
    reducer: TReducer,
  ): Promise<{ cursor: string; state: TState } | undefined> {
    const snapshot = await this.db.snapshots.getByStream(reducer.name, streamOrContext);
    if (snapshot === undefined) {
      return undefined;
    }
    return { cursor: snapshot.cursor, state: snapshot.state as TState };
  }

  async deleteSnapshot<TReducer extends Reducer>(streamOrContext: string, reducer: TReducer): Promise<void> {
    await this.db.snapshots.remove(reducer.name, streamOrContext);
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
