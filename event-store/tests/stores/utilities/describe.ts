import { describe as desc } from "@std/testing/bdd";

import { Projector } from "~libraries/projector.ts";
import type { BrowserEventStore } from "~stores/browser/event-store.ts";
import type { PostgresEventStore } from "~stores/postgres/event-store.ts";
import type { Event, EventRecord } from "~types/event.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

export function describe<TEvent extends Event, TEventRecord extends EventRecord>(
  name: string,
  runner: (getEventStore: EventStoreFn<TEvent, TEventRecord>) => void,
): (getEventStore: EventStoreFn<TEvent, TEventRecord>) => void {
  return (getEventStore: EventStoreFn<TEvent, TEventRecord>) => desc(name, () => runner(getEventStore));
}

type EventStoreFn<TEvent extends Event, TEventRecord extends EventRecord> = (options?: {
  hooks?: EventStoreHooks<TEventRecord>;
}) => Promise<{
  store: PostgresEventStore<TEvent> | BrowserEventStore<TEvent>;
  projector: Projector<TEventRecord>;
}>;
