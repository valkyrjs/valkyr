import type { EventRecord } from "./event.ts";

export type Reducer<TState extends Record<string, unknown> = any, TRecord extends EventRecord = any> = {
  /**
   * Name of the reducer, must be a unique identifier as its used by snapshotter
   * to store, and manage state snapshots for event streams.
   */
  name: string;

  /**
   * Take in a list of events, and return a state from the given events.
   *
   * @param events       - Events to reduce.
   * @param initialState - Initial state to fold onto.
   */
  reduce(events: TRecord[], initialState?: TState): TState;
};

/**
 * Take an event, and fold it onto the given state.
 *
 * @param state - State to fold onto.
 * @param event - Event to fold from.
 *
 * @example
 * ```ts
 * const events = [...events];
 * const state = events.reduce((state, event) => {
 *   state.foo = event.data.foo;
 *   return state;
 * }, {
 *   foo: ""
 * })
 * ```
 */
export type ReducerLeftFold<TState extends Record<string, unknown> = any, TRecord extends EventRecord = any> = (
  state: TState,
  event: TRecord,
) => TState;

/**
 * Reducer configuration containing unique name, and initial state.
 */
export type ReducerConfig<TState extends Record<string, unknown>> = {
  name: string;
  state: () => TState;
};

export type InferReducerState<TReducer> = TReducer extends Reducer<infer TState> ? TState : never;
