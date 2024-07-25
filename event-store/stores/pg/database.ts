import { prepareMigrationFiles } from "@valkyr/toolkit/drizzle";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate as runMigration } from "drizzle-orm/postgres-js/migrator";
import type { Sql } from "postgres";

import { contexts } from "~stores/pg/contexts/schema.ts";
import { events } from "~stores/pg/events/schema.ts";

export const schema = { contexts, events };

/**
 * Takes a `npm:postgres` database instance and migrates event store structure.
 *
 * @param connection - Connection to migrate against.
 * @param output     - Folder to place the migration files in.
 */
export async function migrate(connection: Sql, output: string): Promise<void> {
  await prepareMigrationFiles(import.meta, output, "event-store");
  await runMigration(drizzle(connection, { schema }), {
    migrationsFolder: output,
    migrationsTable: "event_store_migrations",
  });
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type EventStoreDB = PostgresJsDatabase<{
  contexts: typeof contexts;
  events: typeof events;
}>;
