import { EventInsertionFailure } from "~libraries/errors.ts";
import type { EventStoreAdapter } from "~types/event-store-adaper.ts";

export async function insertEventRecord(
  store: EventStoreAdapter,
  record: any,
): Promise<void> {
  try {
    await store.events.insert(record);
  } catch (error) {
    const eventError = new EventInsertionFailure(error.message);
    if (store.hooks?.beforeEventError !== undefined) {
      throw await store.hooks?.beforeEventError(eventError, record);
    }
    throw eventError;
  }
}
