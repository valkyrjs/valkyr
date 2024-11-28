import { resolve } from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate as runMigration } from "drizzle-orm/postgres-js/migrator";
import { type Sql } from "postgres";

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
  await runMigration(drizzle(instance), {
    migrationsFolder: resolve(import.meta.dirname!, "out"),
    migrationsTable: "event_store_migrations",
  });
}
