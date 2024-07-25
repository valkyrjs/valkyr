import { nanoid } from "nanoid";

import type { Event, EventRecord } from "../types/event.ts";
import { getLogicalTimestamp } from "./time.ts";

/**
 * Creates an event record by combining the given event with additional metadata.
 * The resulting record can be stored in an event store.
 *
 * @param event - The event to record.
 */
export function createEventRecord<E extends Event>(
  event: E & {
    stream?: string;
  },
): EventRecord<E> {
  const timestamp = getLogicalTimestamp();
  return {
    id: nanoid(11),
    stream: event.stream ?? nanoid(11),
    type: event.type,
    data: event.data ?? {},
    meta: event.meta ?? {},
    created: timestamp,
    recorded: timestamp,
  };
}
