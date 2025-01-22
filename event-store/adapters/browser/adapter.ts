import type { IndexedDatabase } from "@valkyr/db";

import { Event } from "~types/event.ts";
import { EventStoreAdapter } from "~types/event-store.ts";

import { Adapter, Collections, getEventStoreDatabase } from "./database.ts";
import { BrowserEventProvider } from "./providers/event.ts";
import { BrowserRelationsProvider } from "./providers/relations.ts";
import { BrowserSnapshotProvider } from "./providers/snapshot.ts";

export class BrowserEventStoreAdapter<TEvent extends Event> implements EventStoreAdapter<TEvent> {
  readonly #database: IndexedDatabase<Collections>;

  providers: EventStoreAdapter<TEvent>["providers"];

  constructor(database: Adapter, name = "valkyr:event-store") {
    this.#database = getEventStoreDatabase(name, database) as IndexedDatabase<Collections>;
    this.providers = {
      event: new BrowserEventProvider(this.#database.collection("events")),
      relations: new BrowserRelationsProvider(this.#database.collection("relations")),
      snapshot: new BrowserSnapshotProvider(this.#database.collection("snapshots")),
    };
  }
}
