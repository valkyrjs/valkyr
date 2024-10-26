import type { AggregateRoot } from "~libraries/aggregate.ts";
import type { Unknown } from "~types/common.ts";
import type { EventRecord } from "~types/event.ts";
import type { Reducer, ReducerConfig, ReducerLeftFold, ReducerState } from "~types/reducer.ts";

const names = new Set<string>();

/**
 * Make an event reducer that produces a aggregate instance from resolved
 * events.
 *
 * @param aggregate - Aggregate to instantiate and create an instance of.
 * @param config    - Config containing unique name, type, and filter.
 */
export function makeAggregateReducer<TRecord extends EventRecord, TAggregateRoot extends typeof AggregateRoot<TRecord>>(
  aggregate: TAggregateRoot,
  config: ReducerConfig<TRecord>,
): Reducer<TRecord, InstanceType<TAggregateRoot>> {
  reserveReducerName(config.name);
  return {
    name: config.name,
    type: config.type,
    filter: config.filter,
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
 * @param callback - Method which handles the event reduction.
 * @param config   - Config containing unique name, type, and filter.
 * @param state    - Default state factory.
 */
export function makeReducer<TRecord extends EventRecord, TState extends Unknown>(
  foldFn: ReducerLeftFold<TState, TRecord>,
  config: ReducerConfig<TRecord>,
  stateFn: ReducerState<TState>,
): Reducer<TRecord, TState> {
  reserveReducerName(config.name);
  return {
    name: config.name,
    type: config.type,
    filter: config.filter,
    from(snapshot: TState) {
      return snapshot;
    },
    reduce(events: TRecord[], snapshot?: TState) {
      return events.reduce(foldFn, snapshot ?? (stateFn() as TState));
    },
  };
}

function reserveReducerName(name: string): void {
  if (names.has(name)) {
    throw new Error(`Invalid reducer name '${name}' provided, name is already taken`);
  }
  names.add(name);
}
