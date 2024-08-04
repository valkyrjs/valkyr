import { describe as desc } from "@std/testing/bdd";

import type { PGEventStore } from "~stores/pg/event-store.ts";
import type { SQLiteEventStore } from "~stores/sqlite/event-store.ts";
import type { ValkyrEventStore } from "~stores/valkyr/event-store.ts";
import type { Event, EventRecord } from "~types/event.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

export function describe<TEvent extends Event, TEventRecord extends EventRecord>(
  name: string,
  runner: (getEventStore: EventStoreFn<TEvent, TEventRecord>) => void,
): (getEventStore: EventStoreFn<TEvent, TEventRecord>) => void {
  return (getEventStore: EventStoreFn<TEvent, TEventRecord>) => desc(name, () => runner(getEventStore));
}

type EventStoreFn<TEvent extends Event, TEventRecord extends EventRecord> = (
  hooks?: EventStoreHooks<TEventRecord>,
) => Promise<PGEventStore<TEvent> | SQLiteEventStore<TEvent> | ValkyrEventStore<TEvent>>;
