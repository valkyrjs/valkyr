import { EventDataValidationFailure, EventValidationFailure } from "~libraries/errors.ts";
import type { EventStoreAdapter } from "~types/event-store-adaper.ts";

export async function validateEventRecord(
  store: EventStoreAdapter,
  record: any,
) {
  const { data, meta } = store.getValidator(record.type);
  if (data !== undefined || meta !== undefined) {
    const errors = [];

    if (data !== undefined) {
      const result = await data.safeParseAsync(record.data);
      if (result.success === false) {
        errors.push(result.error.flatten().fieldErrors);
      }
    }

    if (meta !== undefined) {
      const result = await meta.safeParseAsync(record.meta);
      if (result.success === false) {
        errors.push(result.error.flatten().fieldErrors);
      }
    }

    if (errors.length > 0) {
      const error = new EventDataValidationFailure(errors);
      if (store.hooks?.beforeEventError !== undefined) {
        throw await store.hooks?.beforeEventError(error, record);
      }
      throw error;
    }
  }

  try {
    await store.validator.validate(record);
  } catch (error: any) {
    const eventError = new EventValidationFailure(error.message);
    if (store.hooks?.beforeEventError !== undefined) {
      throw await store.hooks?.beforeEventError(eventError, record);
    }
    throw eventError;
  }
}
