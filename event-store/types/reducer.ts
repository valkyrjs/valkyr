import type { AggregateRoot } from "~libraries/aggregate.ts";
import type { Unknown } from "~types/common.ts";
import type { Event, EventToRecord } from "~types/event.ts";

export type Reducer<
  TEvent extends Event = any,
  TState extends (Record<string, unknown> | AggregateRoot<TEvent>) = any,
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
  reduce(events: EventToRecord<TEvent>[], snapshot?: Unknown): TState;
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
export type ReducerLeftFold<TState extends Record<string, unknown> = any, TEvent extends Event = any> = (
  state: TState,
  event: EventToRecord<TEvent>,
) => TState;

export type ReducerState<TState extends Unknown> = () => TState;

export type InferReducerState<TReducer> = TReducer extends Reducer<infer _, infer TState> ? TState : never;
