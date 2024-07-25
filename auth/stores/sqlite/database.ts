import { prepareMigrationFiles } from "@valkyr/toolkit/drizzle";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { migrate as runMigration } from "drizzle-orm/bun-sqlite/migrator";
import type { Database as SQLiteDatabase } from "sqlite";

import { schema as entities } from "./entities/schema.ts";
import { schema as roles } from "./roles/schema.ts";

export const schema = { entities, roles };

/**
 * Takes a `npm:sqlite` database instance and migrates auth structure.
 *
 * @param connection - Connection to migrate against.
 * @param output     - Folder to place the migration files in.
 */
export async function migrate(connection: SQLiteDatabase, output: string): Promise<void> {
  await prepareMigrationFiles(import.meta, output, "auth");
  await runMigration(drizzle(connection, { schema }), {
    migrationsFolder: output,
    migrationsTable: "auth_migrations",
  });
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type AuthDB = BunSQLiteDatabase<{
  entities: typeof entities;
  roles: typeof roles;
}>;
