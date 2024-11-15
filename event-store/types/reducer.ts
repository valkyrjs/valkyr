import type { AggregateRoot } from "~libraries/aggregate.ts";
import type { Unknown } from "~types/common.ts";

import type { EventRecord } from "./event.ts";

export type Reducer<
  TRecord extends EventRecord = any,
  TState extends (Record<string, unknown> | AggregateRoot<TRecord>) = any,
> = {
  /**
   * Return result directly from a snapshot that does not have any subsequent
   * events to fold onto a state.
   *
   * @param snapshot - Snapshot of a reducer state.
   */
  from(snapshot: Unknown): TState;

  /**
   * Take in a list of events, and return a state from the given events.
   *
   * @param events   - Events to reduce.
   * @param snapshot - Initial snapshot state to apply to the reducer.
   */
  reduce(events: TRecord[], snapshot?: Unknown): TState;
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

export type ReducerState<TState extends Unknown> = () => TState;

export type InferReducerState<TReducer> = TReducer extends Reducer<infer _, infer TState> ? TState : never;
