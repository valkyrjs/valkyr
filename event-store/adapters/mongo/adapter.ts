import type { Db, MongoClient } from "mongodb";

import { EventStore } from "~libraries/event-store.ts";
import type { Event } from "~types/event.ts";
import type { EventStoreAdapter, EventStoreConfig } from "~types/event-store.ts";

import { registrars } from "./collections/mod.ts";
import { MongoEventsProvider } from "./providers/events.ts";
import { MongoRelationsProvider } from "./providers/relations.ts";
import { MongoSnapshotsProvider } from "./providers/snapshots.ts";
import { getCollectionsSet } from "./utilities.ts";

export class MongoAdapter<const TEvent extends Event> implements EventStoreAdapter<TEvent> {
  readonly providers: {
    readonly events: MongoEventsProvider<TEvent>;
    readonly relations: MongoRelationsProvider;
    readonly snapshots: MongoSnapshotsProvider;
  };

  #client: MongoClient;

  constructor(readonly client: MongoClient, db: string) {
    this.#client = client;
    this.providers = {
      events: new MongoEventsProvider<TEvent>(this.#client, db),
      relations: new MongoRelationsProvider(this.#client, db),
      snapshots: new MongoSnapshotsProvider(this.#client, db),
    };
  }
}

/**
 * Create a new mongodb supported event store.
 *
 * @param config - Event store config.
 */
export function makeMongoEventStore<const TEvent extends Event>(
  { client, db, events, validators, hooks }:
    & { client: MongoClient; db: string }
    & Omit<EventStoreConfig<TEvent, MongoAdapter<TEvent>>, "adapter">,
): EventStore<TEvent, MongoAdapter<TEvent>> {
  return new EventStore<TEvent, MongoAdapter<TEvent>>({
    adapter: new MongoAdapter(client, db),
    events,
    validators,
    hooks,
  });
}

/**
 * Takes a mongo database and registers the event store collections and
 * indexes defined internally.
 *
 * @param db     - Mongo database to register event store collections against.
 * @param logger - Logger method to print internal logs.
 */
export async function register(db: Db, logger?: (...args: any[]) => any) {
  const list = await getCollectionsSet(db);
  for (const { name, indexes } of registrars) {
    if (list.has(name)) {
      continue;
    }
    await db.createCollection(name);
    for (const [indexSpec, options] of indexes) {
      await db.collection(name).createIndex(indexSpec, options);
      logger?.("Mongo Event Store > Collection '%s' is indexed [%O] with options %O", name, indexSpec, options ?? {});
    }
    logger?.("Mongo Event Store > Collection '%s' is registered", name);
  }
}
