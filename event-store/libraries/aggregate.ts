import type { Unknown } from "~types/common.ts";
import type { EventRecord } from "~types/event.ts";

export abstract class AggregateRoot<TRecord extends EventRecord> {
  static from<TRecord extends EventRecord, TAggregateRoot extends typeof AggregateRoot<TRecord>>(
    this: TAggregateRoot,
    snapshot?: Unknown,
  ): InstanceType<TAggregateRoot> {
    const instance = new (this as any)();
    if (snapshot !== undefined) {
      setSnapshot(instance, snapshot);
    }
    return instance;
  }

  /**
   * Method used to left fold incoming events to the aggregate state.
   *
   * @param event - Event record to fold.
   */
  abstract with(event: TRecord): void;
}

/**
 * Assigns a snapshot to the provided aggregate instance.
 *
 * @param aggregate - Aggregate to populate.
 * @param snapshot  - Snapshot to assign.
 */
function setSnapshot(aggregate: AggregateRoot<any>, snapshot: Unknown) {
  Object.assign(aggregate, snapshot);
}
