import { makeEventRecord } from "~libraries/event.ts";
import type { EventStore } from "~libraries/event-store.ts";
import type { Unknown } from "~types/common.ts";
import type { Event, EventToRecord } from "~types/event.ts";
import { EventsInsertSettings } from "~types/event-store.ts";
import { ExcludeEmptyFields } from "~types/utilities.ts";

export abstract class AggregateRoot<const TEvent extends Event> {
  #pending: EventToRecord<TEvent>[] = [];

  /**
   * Create a new aggregate instance with a optional snapshot. This method
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
   * an event store. This also submits the record to the `.with`
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
   * Method used to left fold incoming events to the aggregate state.
   *
   * @param event - Event record to fold.
   */
  abstract with(event: EventToRecord<TEvent>): void;

  /**
   * Commits all pending events to the given event store.
   *
   * @param eventStore        - Event store to commit pending events too.
   * @param settings          - Event insert settings.
   * @param cleanPendingState - Empty the pending event list after event store push.
   */
  async commit<TEventStore extends EventStore<TEvent>>(eventStore: TEventStore, settings?: EventsInsertSettings, cleanPendingState = true): Promise<this> {
    await eventStore.pushManyEvents(this.#pending, settings);
    if (cleanPendingState === true) {
      this.#pending = [];
    }
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
