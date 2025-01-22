import type { Event, EventRecord, EventToRecord } from "../types/event.ts";
import { makeId } from "./nanoid.ts";
import { getLogicalTimestamp } from "./time.ts";

/**
 * Creates an event record by combining the given event with additional metadata.
 * The resulting record can be stored in an event store.
 *
 * @param event  - The event to record.
 * @param stream - Assign a pre-existing stream.
 */
export function makeEventRecord<const TEvent extends Event, TRecord extends EventRecord = EventToRecord<TEvent>>(event: TEvent & { stream?: string }): TRecord {
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
