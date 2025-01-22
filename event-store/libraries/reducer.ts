import type { AggregateRoot } from "~libraries/aggregate.ts";
import type { Unknown } from "~types/common.ts";
import type { Event, EventToRecord } from "~types/event.ts";
import type { Reducer, ReducerLeftFold, ReducerState } from "~types/reducer.ts";

/**
 * Make an event reducer that produces a aggregate instance from resolved
 * events.
 *
 * @param aggregate - Aggregate to instantiate and create an instance of.
 */
export function makeAggregateReducer<TEvent extends Event, TAggregateRoot extends typeof AggregateRoot<any>>(
  aggregate: TAggregateRoot,
): Reducer<TEvent, InstanceType<TAggregateRoot>> {
  return {
    from(snapshot: Unknown) {
      return aggregate.from(snapshot);
    },
    reduce(events: EventToRecord<TEvent>[], snapshot?: Unknown) {
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
export function makeReducer<TEvent extends Event, TState extends Unknown>(
  foldFn: ReducerLeftFold<TState, TEvent>,
  stateFn: ReducerState<TState>,
): Reducer<TEvent, TState> {
  return {
    from(snapshot: TState) {
      return snapshot;
    },
    reduce(events: EventToRecord<TEvent>[], snapshot?: TState) {
      return events.reduce(foldFn, snapshot ?? (stateFn() as TState));
    },
  };
}
