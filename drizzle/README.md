<p align="center">
  <img src="https://user-images.githubusercontent.com/1998130/229430454-ca0f2811-d874-4314-b13d-c558de8eec7e.svg" />
</p>

# Drizzle

Provides a suite of minor functionality to support lazy loading of drizzle instances, which allows for simpler top level async await functionality with dependency injection patterns.

## Database

Creating a new database for a specific adapter.

```ts
import { Database } from "@valkyr/drizzle";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import psql, { type Sql } from "postgres";

export class PostgresDatabase<TSchema extends Record<string, unknown>> extends Database<Sql, PostgresJsDatabase<TSchema>> {
  #instance?: PostgresJsDatabase<TSchema>;

  constructor(readonly conn: PostgresConnection, readonly schema: TSchema) {
    super();
  }

  override get client(): Sql {
    if (typeof this.conn === "string") {
      return psql(this.conn);
    }
    if ("CLOSE" in this.conn) {
      return this.conn;
    }
    return this.conn();
  }

  override get drizzle(): PostgresJsDatabase<TSchema> {
    if (this.#instance === undefined) {
      this.#instance = drizzle(this.client, { schema: this.schema });
    }
    return this.#instance;
  }
}
```

You can now use this database lazily as it will not load in the client until its explicitly requested.

```ts
const schema = { users }; // users would be a drizzle postgres schema

const db = new PostgresDatabase<EventStoreSchema>(config.database, schema);

const result = await db.select().from(users).where(eq(users.id, "xyz"));
```

## Utilities

```ts
import { takeOne } from "@valkyr/drizzle";

const user = await db.select().from(users).where(eq(users.id, "xyz")).then(takeOne);
```
