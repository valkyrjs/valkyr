import { PostgresDatabase as DrizzlePostgresDatabase } from "@valkyr/drizzle";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate as runMigration } from "drizzle-orm/postgres-js/migrator";
import { type Sql } from "postgres";

import { events } from "./schemas/events.ts";
import { relations } from "./schemas/relations.ts";
import { snapshots } from "./schemas/snapshots.ts";

export const schema = { relations, events, snapshots };

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

/**
 * Migrates the event store schemas against the local database.
 *
 * Note! This only works when event-store is resolved into the node_modules
 * packages, as the migration files are not available on the local machine when
 * not fully resolved.
 *
 * @param instance - Postgres SQL instance to migrate against.
 */
export async function migrate(instance: Sql): Promise<void> {
  await runMigration(drizzle(instance, { schema }), {
    migrationsFolder: import.meta.resolve("./migrations/out").replace("file://", ""),
    migrationsTable: "event_store_migrations",
  });
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type PostgresDatabase = DrizzlePostgresDatabase<EventStoreSchema>;

export type EventStoreDatabase = PostgresJsDatabase<EventStoreSchema>;

export type EventStoreSchema = {
  relations: typeof relations;
  events: typeof events;
  snapshots: typeof snapshots;
};

export type Transaction = Parameters<Parameters<EventStoreDatabase["transaction"]>[0]>[0];
