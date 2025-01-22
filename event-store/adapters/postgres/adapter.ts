import { type PostgresConnection, PostgresDatabase } from "@valkyr/drizzle";

import { Event } from "~types/event.ts";
import { EventStoreAdapter } from "~types/event-store.ts";

import { PostgresEventProvider } from "./providers/event.ts";
import { PostgresRelationsProvider } from "./providers/relations.ts";
import { PostgresSnapshotProvider } from "./providers/snapshot.ts";
import { EventStoreSchema, getEventStoreSchema } from "./schema.ts";

export class PostgresEventStoreAdapter<TEvent extends Event> implements EventStoreAdapter<TEvent> {
  #database: PostgresDatabase<EventStoreSchema>;

  providers: EventStoreAdapter<TEvent>["providers"];

  constructor(readonly connection: PostgresConnection, readonly schemaKey: string) {
    const schema = getEventStoreSchema(schemaKey);
    this.#database = new PostgresDatabase<EventStoreSchema>(connection, schema);
    this.providers = {
      event: new PostgresEventProvider(this.#database, schema.events),
      relations: new PostgresRelationsProvider(this.#database, schema.relations),
      snapshot: new PostgresSnapshotProvider(this.#database, schema.snapshots),
    };
  }
}
