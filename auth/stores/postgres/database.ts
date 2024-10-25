import { PostgresDatabase as DrizzlePostgresDatabase } from "@valkyr/drizzle";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate as runMigration } from "drizzle-orm/postgres-js/migrator";
import { type Sql } from "postgres";

import { entities } from "./entities/schema.ts";
import { roles } from "./roles/schema.ts";

export const schema = { entities, roles };

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

export async function migrate(connection: Sql): Promise<void> {
  await runMigration(drizzle(connection, { schema }), {
    migrationsFolder: import.meta.resolve("./migrations/out").replace("file://", ""),
    migrationsTable: "auth_migrations",
  });
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type PostgresDatabase = DrizzlePostgresDatabase<AuthSchema>;

export type AuthDatabase = PostgresJsDatabase<AuthSchema>;

export type AuthSchema = {
  entities: typeof entities;
  roles: typeof roles;
};
