import { getLogicalTimestamp } from "~libraries/time.ts";
import type { EventStoreAdapter } from "~types/event-store-adaper.ts";
import { insertEventRecord } from "~utilities/event-store/insert-event-record.ts";
import { pushEventRecordUpdates } from "~utilities/event-store/push-event-record-updates.ts";
import { validateEventRecord } from "~utilities/event-store/validate-event-record.ts";

/**
 * Push a new event using the provided event store instance.
 *
 * @param store    - Store used to insert the event record.
 * @param record   - Event record to push to the event store.
 * @param hydrated - Whether the record is hydrated or not.
 */
export async function pushEventRecord(store: EventStoreAdapter, record: any, hydrated: boolean): Promise<string> {
  if (store.hasEvent(record.type) === false) {
    throw new Error(`Event '${record.type}' is not registered with the event store!`);
  }

  const status = await store.getEventStatus(record);
  if (status.exists === true) {
    return record.stream;
  }

  if (hydrated === true) {
    record.recorded = getLogicalTimestamp();
  }

  await validateEventRecord(store, record);
  await insertEventRecord(store, record);
  await pushEventRecordUpdates(store, record, hydrated, status);

  return record.stream;
}
