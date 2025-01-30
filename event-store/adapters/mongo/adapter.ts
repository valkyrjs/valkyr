import type { MongoConnectionUrl } from "@valkyr/testcontainers/mongodb";
import { Db, MongoClient } from "mongodb";

import { EventStore } from "~libraries/event-store.ts";
import type { Event } from "~types/event.ts";
import type { EventStoreAdapter, EventStoreConfig } from "~types/event-store.ts";

import { registrars } from "./collections/mod.ts";
import { MongoEventsProvider } from "./providers/events.ts";
import { MongoRelationsProvider } from "./providers/relations.ts";
import { MongoSnapshotsProvider } from "./providers/snapshots.ts";
import { DatabaseAccessor } from "./types.ts";
import { getCollectionsSet } from "./utilities.ts";

export class MongoAdapter<const TEvent extends Event> implements EventStoreAdapter<TEvent> {
  readonly providers: {
    readonly events: MongoEventsProvider<TEvent>;
    readonly relations: MongoRelationsProvider;
    readonly snapshots: MongoSnapshotsProvider;
  };

  constructor(connection: MongoConnection, db: string) {
    const accessor = getDatabaseAccessor(connection, db);
    this.providers = {
      events: new MongoEventsProvider<TEvent>(accessor),
      relations: new MongoRelationsProvider(accessor),
      snapshots: new MongoSnapshotsProvider(accessor),
    };
  }
}

/**
 * Create a new mongodb supported event store.
 *
 * @param config - Event store config.
 */
export function makeMongoEventStore<const TEvent extends Event>(
  { connection, database, events, validators, hooks }:
    & { connection: MongoConnection; database: string }
    & Omit<EventStoreConfig<TEvent, MongoAdapter<TEvent>>, "adapter">,
): EventStore<TEvent, MongoAdapter<TEvent>> {
  return new EventStore<TEvent, MongoAdapter<TEvent>>({
    adapter: new MongoAdapter(connection, database),
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

function getDatabaseAccessor(connection: MongoConnection, database: string): DatabaseAccessor {
  let instance: Db | undefined;
  return {
    get db(): Db {
      if (instance === undefined) {
        instance = this.client.db(database);
      }
      return instance;
    },
    get client(): MongoClient {
      if (typeof connection === "string") {
        return new MongoClient(connection);
      }
      if (connection instanceof MongoClient) {
        return connection;
      }
      return connection();
    },
  };
}

export type MongoConnection = MongoConnectionUrl | MongoClient | (() => MongoClient);
