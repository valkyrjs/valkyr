import type { IndexedDatabase } from "@valkyr/db";

import { Event } from "~types/event.ts";
import { EventStoreAdapter, EventStoreConfig } from "~types/event-store.ts";

import { Adapter, Collections, getEventStoreDatabase } from "./database.ts";
import { BrowserEventsProvider } from "./providers/events.ts";
import { BrowserRelationsProvider } from "./providers/relations.ts";
import { BrowserSnapshotsProvider } from "./providers/snapshots.ts";
import { EventStore } from "~libraries/event-store.ts";

export class BrowserAdapter<TEvent extends Event> implements EventStoreAdapter<TEvent> {
  readonly #database: IndexedDatabase<Collections>;

  providers: EventStoreAdapter<TEvent>["providers"];

  constructor(database: Adapter, name = "valkyr:event-store") {
    this.#database = getEventStoreDatabase(name, database) as IndexedDatabase<Collections>;
    this.providers = {
      events: new BrowserEventsProvider(this.#database.collection("events")),
      relations: new BrowserRelationsProvider(this.#database.collection("relations")),
      snapshots: new BrowserSnapshotsProvider(this.#database.collection("snapshots")),
    };
  }
}

/**
 * Create a new browser supported event store. This uses the browsers memory
 * or persistent storage solutions.
 *
 * @param config - Event store config.
 */
export function makeBrowserEventStore<const TEvent extends Event>(
  { database, name, events, validators, hooks }:
    & { database: Adapter; name?: string }
    & Omit<EventStoreConfig<TEvent, BrowserAdapter<TEvent>>, "adapter">,
): EventStore<TEvent, BrowserAdapter<TEvent>> {
  return new EventStore<TEvent, BrowserAdapter<TEvent>>({
    adapter: new BrowserAdapter(database, name),
    events,
    validators,
    hooks,
  });
}
