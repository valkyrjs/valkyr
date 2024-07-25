import { EventInsertionFailure } from "~libraries/errors.ts";
import { ValkyrEventStore } from "~stores/valkyr/event-store.ts";
import type { EventStoreAdapter } from "~types/event-store-adaper.ts";

export async function insertEventRecord(
  store: EventStoreAdapter,
  record: any,
  tx?: any,
): Promise<void> {
  try {
    if (store instanceof ValkyrEventStore) {
      await store.events.insert(record);
    } else {
      await store.events.insert(record, tx);
    }
  } catch (error) {
    const eventError = new EventInsertionFailure(error.message);
    if (store.hooks?.beforeEventError !== undefined) {
      throw await store.hooks?.beforeEventError(eventError, record);
    }
    throw eventError;
  }
}
