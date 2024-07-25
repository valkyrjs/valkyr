/**
 * Represents an empty object.
 */
export type Empty = Record<string, never>;

/**
 * Represent an unknown object.
 */
export type Unknown = Record<string, unknown>;

/**
 * Represents a subscription that exposes a way to unsubscribe.
 *
 * @example
 *
 * ```ts
 * function subscribe(): Subscription {
 *   const interval = setInterval(() => console.log("foo"), 1000);
 *   return {
 *     unsubscribe() {
 *       clearInterval(interval);
 *     }
 *   }
 * }
 * ```
 */
export type Subscription = {
  /**
   * Gracefully terminate a decoupled subscriber.
   */
  unsubscribe: () => void;
};
