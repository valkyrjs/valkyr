import type { AggregateRoot } from "~libraries/aggregate.ts";
import type { Unknown } from "~types/common.ts";
import type { EventRecord } from "~types/event.ts";
import type { Reducer, ReducerLeftFold, ReducerState } from "~types/reducer.ts";

/**
 * Make an event reducer that produces a aggregate instance from resolved
 * events.
 *
 * @param aggregate - Aggregate to instantiate and create an instance of.
 */
export function makeAggregateReducer<TRecord extends EventRecord, TAggregateRoot extends typeof AggregateRoot<TRecord>>(
  aggregate: TAggregateRoot,
): Reducer<TRecord, InstanceType<TAggregateRoot>> {
  return {
    from(snapshot: Unknown) {
      return aggregate.from(snapshot);
    },
    reduce(events: TRecord[], snapshot?: Unknown) {
      const instance = aggregate.from(snapshot);
      for (const event of events) {
        instance.with(event);
      }
      return instance;
    },
  };
}

/**
 * Make an event reducer that produces a state based on resolved events.
 *
 * @param foldFn  - Method which handles the event reduction.
 * @param stateFn - Default state factory.
 */
export function makeReducer<TRecord extends EventRecord, TState extends Unknown>(
  foldFn: ReducerLeftFold<TState, TRecord>,
  stateFn: ReducerState<TState>,
): Reducer<TRecord, TState> {
  return {
    from(snapshot: TState) {
      return snapshot;
    },
    reduce(events: TRecord[], snapshot?: TState) {
      return events.reduce(foldFn, snapshot ?? (stateFn() as TState));
    },
  };
}
