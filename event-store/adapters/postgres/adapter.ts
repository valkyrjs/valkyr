import { EventStore } from "~libraries/event-store.ts";
import type { Event } from "~types/event.ts";
import type { EventStoreAdapter, EventStoreConfig } from "~types/event-store.ts";

import { type PostgresConnection, PostgresDatabase } from "./database.ts";
import { PostgresEventsProvider } from "./providers/event.ts";
import { PostgresRelationsProvider } from "./providers/relations.ts";
import { PostgresSnapshotsProvider } from "./providers/snapshot.ts";
import { getEventStoreSchema } from "./schema.ts";
import type { EventStoreSchema } from "./types.ts";

/**
 * A server-based event store adapter that integrates database-specific providers.
 *
 * The `PostgresAdapter` enables event sourcing in a back end environment by utilizing
 * PostgreSql for storage. It provides implementations for event storage, relations,
 * and snapshots, allowing seamless integration with the shared event store interface.
 *
 * @template TEvent - The type of events managed by the event store.
 */
export class PostgresAdapter<const TEvent extends Event> implements EventStoreAdapter<TEvent> {
  readonly providers: {
    readonly events: PostgresEventsProvider<TEvent>;
    readonly relations: PostgresRelationsProvider;
    readonly snapshots: PostgresSnapshotsProvider;
  };

  #database: PostgresDatabase<EventStoreSchema>;

  constructor(readonly connection: PostgresConnection, readonly schemaKey: string) {
    const schema = getEventStoreSchema(schemaKey);
    this.#database = new PostgresDatabase<EventStoreSchema>(connection, schema);
    this.providers = {
      events: new PostgresEventsProvider<TEvent>(this.#database, schema.events),
      relations: new PostgresRelationsProvider(this.#database, schema.relations),
      snapshots: new PostgresSnapshotsProvider(this.#database, schema.snapshots),
    };
  }
}

/**
 * Create a new postgres supported event store.
 *
 * @param config - Event store config.
 */
export function makePostgresEventStore<const TEvent extends Event>(
  { connection, schema, events, validators, hooks }:
    & { connection: PostgresConnection; schema: string }
    & Omit<EventStoreConfig<TEvent, PostgresAdapter<TEvent>>, "adapter">,
): EventStore<TEvent, PostgresAdapter<TEvent>> {
  return new EventStore<TEvent, PostgresAdapter<TEvent>>({
    adapter: new PostgresAdapter(connection, schema),
    events,
    validators,
    hooks,
  });
}
