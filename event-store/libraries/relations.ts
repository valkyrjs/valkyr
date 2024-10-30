import type { EventRecord } from "~types/event.ts";
import type { Relation, RelationHandler } from "~types/relation.ts";

import { Queue } from "./queue.ts";

export class Relations<Record extends EventRecord> {
  #handlers = new Map<string, RelationHandler<Record>>();
  #queues: { [stream: string]: Queue<Record> } = {};
  #handle: (relations: Relation[]) => Promise<void>;

  constructor(handle: (relations: Relation[]) => Promise<void>) {
    this.push = this.push.bind(this);
    this.#handle = handle;
  }

  #makeQueue(stream: string) {
    this.#queues[stream] = new Queue(async (event) => {
      const handler = this.#handlers.get(event.type);
      if (handler !== undefined) {
        const relations = await handler(event);
        await this.#handle(relations.map((relation) => ({ ...relation, stream: event.stream })));
      }
    }, {
      onDrained: () => {
        delete this.#queues[stream];
      },
    });
  }

  /**
   * Register a relations handler for a specific event type used to map relations from the
   * event to the relations table.
   *
   * @param type    - Event type to register the validation handler for.
   * @param handler - Validation handler to register.
   *
   * @returns function to unregister the validation handler.
   */
  register<T extends Record["type"], R extends Record = Extract<Record, { type: T }>>(
    type: T,
    handler: RelationHandler<R>,
  ): void {
    this.#handlers.set(type, handler as RelationHandler<Record>);
  }

  /**
   * Push a new relational record to the database.
   *
   * @param record - Event record to generate relations from.
   */
  async push(record: Record): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (this.#queues[record.stream] === undefined) {
        this.#makeQueue(record.stream);
      }
      this.#queues[record.stream].push(record, resolve, reject);
    });
  }
}
