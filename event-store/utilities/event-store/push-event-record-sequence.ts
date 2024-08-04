import { getLogicalTimestamp } from "~libraries/time.ts";
import type { PGEventStore } from "~stores/pg/event-store.ts";
import type { SQLiteEventStore } from "~stores/sqlite/event-store.ts";
import type { EventStatus } from "~types/event.ts";
import { insertEventRecord } from "~utilities/event-store/insert-event-record.ts";
import { validateEventRecord } from "~utilities/event-store/validate-event-record.ts";

export async function pushEventRecordSequence(
  store: PGEventStore<any> | SQLiteEventStore<any>,
  records: {
    record: any;
    hydrated: boolean;
  }[],
): Promise<Insert[]> {
  const inserts: Insert[] = [];
  for (const { record, hydrated } of records) {
    if (store.hasEvent(record.type) === false) {
      throw new Error(`Event '${record.type}' is not registered with the event store!`);
    }
    const status = await store.getEventStatus(record);
    if (status.exists === true) {
      continue;
    }
    if (hydrated === true) {
      record.recorded = getLogicalTimestamp();
    }
    await validateEventRecord(store, record);
    await insertEventRecord(store, record);
    inserts.push({ record, hydrated, status });
  }
  return inserts;
}

type Insert = {
  record: any;
  hydrated: boolean;
  status: EventStatus;
};
