import type { Context, ContextHandler } from "~types/context.ts";
import type { EventRecord } from "~types/event.ts";

import { Queue } from "./queue.ts";

export class Contextor<Record extends EventRecord> {
  #handlers = new Map<string, ContextHandler<Record>>();
  #queue: Queue<Record>;

  constructor(handle: (contexts: Context[]) => Promise<void>) {
    this.push = this.push.bind(this);
    this.#queue = new Queue(async (event) => {
      const handler = this.#handlers.get(event.type);
      if (handler !== undefined) {
        const contexts = await handler(event);
        await handle(contexts.map((context) => ({ ...context, stream: event.stream })));
      }
    });
  }

  /**
   * Validate a event before its committed to the event store. Throwing an error results
   * in invalidation, otherwise the event is committed.
   *
   * @param record - Event record to validate.
   */
  async push(record: Record): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.#queue.push(record, resolve, reject);
    });
  }

  /**
   * Register a context handler for a specific event type used to map context from the
   * event to the context table.
   *
   * @param type    - Event type to register the validation handler for.
   * @param handler - Validation handler to register.
   *
   * @returns function to unregister the validation handler.
   */
  register<T extends Record["type"], R extends Record = Extract<Record, { type: T }>>(
    type: T,
    handler: ContextHandler<R>,
  ): void {
    this.#handlers.set(type, handler as ContextHandler<Record>);
  }
}
