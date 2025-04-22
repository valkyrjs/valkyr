import type { IndexedDatabase } from "@valkyr/db";

import { EventStore } from "~libraries/event-store.ts";
import { Event } from "~types/event.ts";
import { EventStoreAdapter, EventStoreConfig } from "~types/event-store.ts";

import { Adapter, Collections, getEventStoreDatabase } from "./database.ts";
import { BrowserEventsProvider } from "./providers/events.ts";
import { BrowserRelationsProvider } from "./providers/relations.ts";
import { BrowserSnapshotsProvider } from "./providers/snapshots.ts";

/**
 * A browser-based event store adapter that integrates database-specific providers.
 *
 * The `BrowserAdapter` enables event sourcing in a browser environment by utilizing
 * IndexedDB for storage. It provides implementations for event storage, relations,
 * and snapshots, allowing seamless integration with the shared event store interface.
 *
 * @template TEvent - The type of events managed by the event store.
 */
export class BrowserAdapter<TEvent extends Event> implements EventStoreAdapter<IndexedDatabase<Collections>, TEvent> {
  readonly #database: IndexedDatabase<Collections>;

  readonly providers: EventStoreAdapter<IndexedDatabase<Collections>, TEvent>["providers"];

  constructor(database: Adapter, name = "valkyr:event-store") {
    this.#database = getEventStoreDatabase(name, database) as IndexedDatabase<Collections>;
    this.providers = {
      events: new BrowserEventsProvider(this.#database.collection("events")),
      relations: new BrowserRelationsProvider(this.#database.collection("relations")),
      snapshots: new BrowserSnapshotsProvider(this.#database.collection("snapshots")),
    };
  }

  get db(): IndexedDatabase<Collections> {
    return this.#database;
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
