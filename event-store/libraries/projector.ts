import type { Subscription } from "~types/common.ts";
import type { EventRecord } from "~types/event.ts";

import type {
  BatchedProjectionHandler,
  BatchedProjectorListeners,
  ProjectionFilter,
  ProjectionHandler,
  ProjectionStatus,
  ProjectorListenerFn,
  ProjectorListeners,
  ProjectorMessage,
} from "../types/projector.ts";
import { Queue } from "./queue.ts";

/*
 |--------------------------------------------------------------------------------
 | Filters
 |--------------------------------------------------------------------------------
 */

const FILTER_ONCE = Object.freeze<ProjectionFilter>({
  allowHydratedEvents: false,
  allowOutdatedEvents: false,
});

const FILTER_CONTINUOUS = Object.freeze<ProjectionFilter>({
  allowHydratedEvents: true,
  allowOutdatedEvents: false,
});

const FILTER_ALL = Object.freeze<ProjectionFilter>({
  allowHydratedEvents: true,
  allowOutdatedEvents: true,
});

/*
 |--------------------------------------------------------------------------------
 | Projector
 |--------------------------------------------------------------------------------
 */

/**
 * Manages event projections by handling and distributing events to registered listeners.
 *
 * The `Projector` class is responsible for processing event records and invoking
 * projection handlers based on predefined filters. It supports different projection
 * patterns, including one-time projections, continuous projections, and catch-all projections.
 * Additionally, it enables batched event processing for optimized handling of multiple events.
 *
 * @template Record - The type of event records processed by this projector.
 */
export class Projector<Record extends EventRecord = EventRecord> {
  #listeners: ProjectorListeners<Record> = {};
  #batchedListeners: BatchedProjectorListeners<Record> = {};
  #queues: {
    [stream: string]: Queue<ProjectorMessage<Record>>;
  } = {};

  constructor() {
    this.push = this.push.bind(this);
  }

  #makeQueue(stream: string) {
    this.#queues[stream] = new Queue(async ({ record, status }) => {
      return Promise.all(Array.from(this.#listeners[record.type as string] || []).map((fn) => fn(record, status)));
    }, {
      onDrained: () => {
        delete this.#queues[stream];
      },
    });
  }

  /*
   |--------------------------------------------------------------------------------
   | Methods
   |--------------------------------------------------------------------------------
   */

  async push(record: Record, status: ProjectionStatus): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (this.#queues[record.stream] === undefined) {
        this.#makeQueue(record.stream);
      }
      this.#queues[record.stream].push({ record, status }, resolve, reject);
    });
  }

  async pushMany(key: string, records: Record[]): Promise<void> {
    await Promise.all(Array.from(this.#batchedListeners[key] || []).map((fn) => fn(records)));
  }

  /*
   |--------------------------------------------------------------------------------
   | Handlers
   |--------------------------------------------------------------------------------
   */

  /**
   * Create a batched projection handler taking in a list of events inserted under
   * a specific batched key.
   *
   * @param key     - Batch key being projected.
   * @param handler - Handler method to execute when events are projected.
   */
  batch(key: string, handler: BatchedProjectionHandler<Record>): Subscription {
    const listeners = (this.#batchedListeners[key] ?? (this.#batchedListeners[key] = new Set())).add(handler);
    return {
      unsubscribe() {
        listeners.delete(handler);
      },
    };
  }

  /**
   * Create a single run projection handler.
   *
   * @remarks
   *
   * This method tells the projection that an event is only ever processed when
   * the event is originating directly from the local event store. A useful
   * pattern for when you want the event handler to submit data to a third
   * party service such as sending an email or submitting third party orders.
   *
   * We disallow `hydrate` and `outdated` as these events represents events
   * that has already been processed.
   *
   * @param type    - Event type being projected.
   * @param handler - Handler method to execute when event is projected.
   */
  once<Type extends Record["type"], R extends Record = Extract<Record, { type: Type }>>(
    type: Type,
    handler: ProjectionHandler<R>,
  ): Subscription {
    return this.#subscribe(type, FILTER_ONCE, handler as ProjectionHandler);
  }

  /**
   * Create a continuous projection handler.
   *
   * @remarks
   *
   * This method tells the projection to allow events directly from the event
   * store as well as events coming through hydration via sync, manual or
   * automatic stream rehydration operations. This is the default pattern
   * used for most events. This is where you usually project the latest data
   * to your read side models and data stores.
   *
   * We allow `hydrate` as they serve to keep the read side up to date with
   * the latest events. We disallow `outdated` as we do not want the latest
   * data to be overridden by outdated ones.
   *
   * NOTE! The nature of this pattern means that outdated events are never
   * run by this projection. Make sure to handle `outdated` events if you
   * have processing requirements that needs to know about every unknown
   * events that has occurred in the event stream.
   *
   * @param type    - Event type being projected.
   * @param handler - Handler method to execute when event is projected.
   */
  on<Type extends Record["type"], R extends Record = Extract<Record, { type: Type }>>(
    type: Type,
    handler: ProjectionHandler<R>,
  ): Subscription {
    return this.#subscribe(type, FILTER_CONTINUOUS, handler as ProjectionHandler);
  }

  /**
   * Create a catch all projection handler.
   *
   * @remarks
   *
   * This method is a catch all for events that does not fall under the
   * stricter definitions of once and on patterns. This is a good place
   * to deal with data that does not depend on a strict order of events.
   *
   * @param type    - Event type being projected.
   * @param handler - Handler method to execute when event is projected.
   */
  all<Type extends Record["type"], R extends Record = Extract<Record, { type: Type }>>(
    type: Type,
    handler: ProjectionHandler<R>,
  ): Subscription {
    return this.#subscribe(type, FILTER_ALL, handler as ProjectionHandler);
  }

  /*
   |--------------------------------------------------------------------------------
   | Helpers
   |--------------------------------------------------------------------------------
   */

  /**
   * Create a event subscription against given type with assigned filter and handler.
   *
   * @param type    - Event type to listen for.
   * @param filter  - Projection filter to validate against.
   * @param handler - Handler to execute.
   */
  #subscribe(type: string, filter: ProjectionFilter, handler: ProjectionHandler): { unsubscribe: () => void } {
    return {
      unsubscribe: this.#addEventListener(type, async (record, state) => {
        if (this.#hasValidState(filter, state)) {
          await handler(record);
        }
      }),
    };
  }

  /**
   * Register a new event listener to handle incoming projection requests.
   *
   * @param type - Event type to listen for.
   * @param fn   - Listener fn to execute.
   */
  #addEventListener(type: string, fn: ProjectorListenerFn<Record>): () => void {
    const listeners = (this.#listeners[type] ?? (this.#listeners[type] = new Set())).add(fn);
    return () => {
      listeners.delete(fn);
    };
  }

  /**
   * Check if the projection filter is compatible with the provided state.
   *
   * @param filter - Projection filter to match against.
   * @param state  - Projection state to validate.
   */
  #hasValidState(filter: ProjectionFilter, { hydrated, outdated }: ProjectionStatus) {
    if (filter.allowHydratedEvents === false && hydrated === true) {
      return false;
    }
    if (filter.allowOutdatedEvents === false && outdated === true) {
      return false;
    }
    return true;
  }
}
