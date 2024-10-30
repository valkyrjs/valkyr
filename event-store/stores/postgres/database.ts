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

export async function migrate(connection: Sql): Promise<void> {
  await runMigration(drizzle(connection, { schema }), {
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
