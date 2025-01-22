import { describe as desc } from "@std/testing/bdd";

import { EventStore } from "~libraries/event-store.ts";
import { Projector } from "~libraries/projector.ts";
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
  store: EventStore<TEvent>;
  projector: Projector<TEventRecord>;
}>;
