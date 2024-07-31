import type { EventRecord } from "./event.ts";

export type Reducer<TState extends Record<string, unknown> = any, TRecord extends EventRecord = any> = {
  /**
   * Name of the reducer, must be a unique identifier as its used by snapshotter
   * to store, and manage state snapshots for event streams.
   */
  name: ReducerConfig<TState, TRecord>["name"];

  /**
   * Reducer type which defines if events are pulled from multiple context streams,
   * or a single stream. The type defines how the `.reduce` method retrieves events
   * from the store.
   */
  type: ReducerConfig<TState, TRecord>["type"];

  /**
   * Filter options for how events are pulled from the store.
   */
  filter?: ReducerConfig<TState, TRecord>["filter"];

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
export type ReducerConfig<TState extends Record<string, unknown>, TRecord extends EventRecord> = {
  /**
   * Name of the reducer, must be a unique identifier as its used by snapshotter
   * to store, and manage state snapshots for event streams.
   */
  name: string;

  /**
   * Reducer type which defines if events are pulled from multiple context streams,
   * or a single stream. The type defines how the `.reduce` method retrieves events
   * from the store.
   */
  type: "stream" | "context";

  /**
   * Filter options for how events are pulled from the store.
   */
  filter?: {
    /**
     * Only include events of in the given type.
     */
    types?: TRecord["type"][];
  };

  /**
   * Initial state to make for the reducer.
   */
  state: () => TState;
};

export type InferReducerState<TReducer> = TReducer extends Reducer<infer TState> ? TState : never;
