import { makeId } from "@valkyr/drizzle";

import type { Event, EventRecord } from "../types/event.ts";
import { getLogicalTimestamp } from "./time.ts";

/**
 * Creates an event record by combining the given event with additional metadata.
 * The resulting record can be stored in an event store.
 *
 * @param event - The event to record.
 */
export function createEventRecord<TEvent extends Event, TRecord extends EventRecord>(
  event: TEvent & {
    stream?: string;
  },
): TRecord {
  const timestamp = getLogicalTimestamp();
  return {
    id: makeId(),
    stream: event.stream ?? makeId(),
    type: event.type,
    data: event.data ?? {},
    meta: event.meta ?? {},
    created: timestamp,
    recorded: timestamp,
  } as TRecord;
}
