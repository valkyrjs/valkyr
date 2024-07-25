import type { Unknown } from "../types/common.ts";
import type { EventRecord } from "../types/event.ts";
import type { Reducer, ReducerLeftFold } from "../types/reducer.ts";

const names = new Set<string>();

/**
 * Make an even reducer that produces a state based on incoming events.
 *
 * @param reducer - Method which handles the event reduction.
 * @param config  - Config containing unique name, and initial state.
 */
export function makeReducer<TState extends Unknown, TRecord extends EventRecord>(
  fold: ReducerLeftFold<TState, TRecord>,
  config: { name: string; state: () => Partial<TState> },
): Reducer<TState, TRecord> {
  reserveReducerName(config.name);
  return {
    name: config.name,
    reduce(events: TRecord[], state?: TState) {
      return events.reduce(fold, state ?? (config.state() as TState));
    },
  };
}

function reserveReducerName(name: string): void {
  if (names.has(name)) {
    throw new Error(`Invalid reducer name '${name}' provided, name is already taken`);
  }
  names.add(name);
}
