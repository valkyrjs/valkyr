import type { Unknown } from "~types/common.ts";
import type { EventRecord } from "~types/event.ts";
import { EventStore } from "~types/event-store.ts";

export abstract class AggregateRoot<TRecord extends EventRecord> {
  #pending: TRecord[] = [];

  /**
   * Create a new aggregate instance with a optional snapshot. This method
   * exists as a unified way to create new aggregates from a event store
   * adapter and not really meant for aggregate creation outside of the
   * event store.
   *
   * @param snapshot - Snapshot to assign to the aggregate state.
   */
  static from<TRecord extends EventRecord, TAggregateRoot extends typeof AggregateRoot<TRecord>>(
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
   * foo.push(eventStore.makeEvent({
   *   type: "foo:bar-set",
   *   stream: foo.id,
   *   data: { bar: "foobar" }
   * }));
   *
   * await foo.commit(eventStore);
   *
   * @param record - Event record to push to the pending list.
   */
  push(record: TRecord): this {
    this.#pending.push(record);
    this.with(record);
    return this;
  }

  /**
   * Method used to left fold incoming events to the aggregate state.
   *
   * @param event - Event record to fold.
   */
  abstract with(event: TRecord): void;

  /**
   * Commits all pending events to the given event store.
   *
   * @param eventStore        - Event store to commit pending events too.
   * @param cleanPendingState - Empty the pending event list after event store push.
   */
  async commit<TEventStore extends EventStore<any, TRecord>>(eventStore: TEventStore, cleanPendingState = true): Promise<this> {
    await eventStore.pushManyEvents(this.#pending);
    if (cleanPendingState === true) {
      this.#pending = [];
    }
    return this;
  }
}
