import { EventEmitter as BaseEventEmitter } from "eventemitter3";

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 */
export class EventEmitter<EventTypes extends ValidEventTypes = string | symbol> extends BaseEventEmitter<EventTypes> {
  /**
   * Add a event subscriber to the given event.
   *
   * @param event   - Event to subscribe to.
   * @param fn      - Event listener method to execute when event occurs.
   * @param destroy - Method to execute when the subscription is terminated.
   *
   * @example
   * ```ts
   * const subscription = eventEmitter.subscribe("foo", () => {
   *   // handle foo event ...
   * }, () => {
   *   // clean up on subscription termination ...
   * })
   * ```
   */
  subscribe<T extends EventNames<EventTypes>>(
    event: T,
    fn: EventListener<EventTypes, T>,
    destroy?: () => void,
  ): Subscription {
    this.addListener(event, fn);
    return {
      unsubscribe: () => {
        this.removeListener(event, fn);
        if (destroy) {
          destroy();
        }
      },
    };
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

/**
 * EventEmitter subscription.
 */
export type Subscription = {
  /**
   * Removes event listener for the event handler that was registered with the
   * subscriber.
   */
  unsubscribe: () => void;
};

type EventListener<T extends ValidEventTypes, K extends EventNames<T>> = T extends string | symbol ? (...args: any[]) => void
  : (...args: ArgumentMap<Exclude<T, string | symbol>>[Extract<K, keyof T>]) => void;

type EventNames<T extends ValidEventTypes> = T extends string | symbol ? T : keyof T;

type ValidEventTypes = string | symbol | Record<string, unknown>;

type ArgumentMap<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends (...args: any[]) => void ? Parameters<T[K]> : T[K] extends any[] ? T[K] : any[];
};
