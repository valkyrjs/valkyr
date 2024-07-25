import { EventContextFailure, EventProjectionFailure } from "~libraries/errors.ts";
import type { EventStatus } from "~types/event.ts";
import type { EventStoreAdapter } from "~types/event-store-adaper.ts";

export async function pushEventRecordUpdates(
  store: EventStoreAdapter,
  record: any,
  hydrated: boolean,
  status: EventStatus,
) {
  try {
    if ("contextor" in store) {
      await store.contextor.push(record);
    }
  } catch (error) {
    store.hooks?.afterEventError?.(new EventContextFailure(error.message), record);
  }

  try {
    await store.projector.project(record, { hydrated, outdated: status.outdated });
  } catch (error) {
    store.hooks?.afterEventError?.(new EventProjectionFailure(error.message), record);
  }

  store.hooks?.afterEventInsert?.(record, hydrated);
}
