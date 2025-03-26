import { makeEventRecord } from "~libraries/event.ts";
import type { EventStore } from "~libraries/event-store.ts";
import type { Unknown } from "~types/common.ts";
import type { Event, EventToRecord } from "~types/event.ts";
import { EventsInsertSettings } from "~types/event-store.ts";
import { ExcludeEmptyFields } from "~types/utilities.ts";

/**
 * Represents an aggregate root in an event-sourced system.
 *
 * This abstract class serves as a base for domain aggregates that manage
 * state changes through events. It provides functionality for creating
 * instances from snapshots, handling pending events, and committing
 * changes to an event store.
 *
 * @template TEvent - The type of events associated with this aggregate.
 */
export abstract class AggregateRoot<const TEvent extends Event> {
  #pending: EventToRecord<TEvent>[] = [];

  /**
   * Does the aggregate have pending events to submit to the event store.
   */
  get isDirty(): boolean {
    return this.#pending.length > 0;
  }

  /**
   * Create a new aggregate instance with an optional snapshot. This method
   * exists as a unified way to create new aggregates from a event store
   * adapter and not really meant for aggregate creation outside of the
   * event store.
   *
   * @param snapshot - Snapshot to assign to the aggregate state.
   */
  static from<TEvent extends Event, TAggregateRoot extends typeof AggregateRoot<TEvent>>(
    this: TAggregateRoot,
    snapshot?: Unknown,
  ): InstanceType<TAggregateRoot> {
    const instance = new (this as any)();
    if (snapshot !== undefined) {
      Object.assign(instance, snapshot);
    }
    return instance;
  }

  /**
   * Push a new event record to the pending list of events to commit to
   * a event store. This also submits the record to the `.with`
   * aggregate folder to update the aggregate state.
   *
   * @example
   *
   * const foo = await Foo.reduce(stream);
   *
   * foo.push({
   *   type: "foo:bar-set",
   *   stream: foo.id,
   *   data: { bar: "foobar" }
   * });
   *
   * await foo.commit(eventStore);
   *
   * @param event - Event to push into the pending commit pool.
   */
  push(event: ExcludeEmptyFields<TEvent> & { stream?: string }): this {
    const record = makeEventRecord(event as any) satisfies EventToRecord<TEvent>;
    this.#pending.push(record);
    this.with(record);
    return this;
  }

  /**
   * Processes and applies incoming events to update the aggregate state.
   *
   * @param event - Event record to fold.
   */
  abstract with(event: EventToRecord<TEvent>): void;

  /**
   * Commits all pending events to the given event store.
   *
   * @param eventStore         - Event store to commit pending events to.
   * @param settings           - Event insert settings.
   * @param shouldFlushPending - Empty the pending event list after event store push.
   */
  async commit<TEventStore extends EventStore<TEvent>>(eventStore: TEventStore, settings?: EventsInsertSettings, shouldFlushPending = true): Promise<this> {
    if (this.isDirty === false) {
      return this;
    }
    await eventStore.pushManyEvents(this.#pending, settings);
    if (shouldFlushPending === true) {
      this.flush();
    }
    return this;
  }

  /**
   * Removes all events from the aggregate #pending list.
   */
  flush(): this {
    this.#pending = [];
    return this;
  }

  /**
   * Returns the aggregate pending event record list. This allows for
   * extraction of the pending commit list so that it can be used in
   * event submission across multiple aggregates.
   */
  toPending(): EventToRecord<TEvent>[] {
    return this.#pending;
  }
}
