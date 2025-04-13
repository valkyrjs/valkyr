import { EventStore } from "~libraries/event-store.ts";
import type { Event } from "~types/event.ts";
import type { EventStoreAdapter, EventStoreConfig } from "~types/event-store.ts";

import { PostgresConnection } from "./connection.ts";
import { PostgresDatabase } from "./database.ts";
import { PostgresEventsProvider } from "./providers/event.ts";
import { PostgresRelationsProvider } from "./providers/relations.ts";
import { PostgresSnapshotsProvider } from "./providers/snapshot.ts";

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

  #database: PostgresDatabase;

  constructor(readonly connection: PostgresConnection, readonly options: Options = {}) {
    this.#database = new PostgresDatabase(connection);
    this.providers = {
      events: new PostgresEventsProvider<TEvent>(this.#database, options.schema),
      relations: new PostgresRelationsProvider(this.#database, options.schema),
      snapshots: new PostgresSnapshotsProvider(this.#database, options.schema),
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
    adapter: new PostgresAdapter(connection, { schema }),
    events,
    validators,
    hooks,
  });
}

type Options = {
  schema?: string;
};
