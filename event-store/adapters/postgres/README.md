<p align="center">
  <img src="https://user-images.githubusercontent.com/1998130/229430454-ca0f2811-d874-4314-b13d-c558de8eec7e.svg" />
</p>

# Postgres Adapter

The following instructions aims to guide you through setting up @valkyr/event-store with a postgres database.

## Event Store

Once we have defined our configs and printed our events we create a new postgres event store instance.

```ts
import { makePostgresEventStore } from "@valkyr/event-store/postgres";
import postgres from "postgres";

import { type Event, type EventRecord, events, validators } from "./generated/events.ts";

export const eventStore = makePostgresEventStore<Event>({
  connection: () => postgres("postgres://${string}:${string}@${string}:${number}/${string}"), // lazy loaded connection
  schema: "event_store",
  events,
  validators,
  hooks: {
    async onError(error) {
      // when the event store throws unhandled errors they will end up in
      // this location that can be further logged in the systems own logger
      // if onError hook is not provided all unhandled errors are logged
      // through the `console.error` method.
    },
  },
});

const projector = new Projector<EventRecord>();

eventStore.onEventsInserted(async (records, { batch }) => {
  // trigger event side effects here such as sending the records through
  // an event messaging system or other projection patterns

  // ### Projector
  // The following is an example when registering event handlers with the
  // projectors instance provided by this library.

  if (batch !== undefined) {
    await projector.pushMany(batch, records);
  } else {
    for (const record of records) {
      await projector.push(record, { hydrated: false, outdated: false });
    }
  }
});
```

## Migrations

We do not manage migrations in your local solutions so what we provide is a sample SQL script for optimal query setup. The following example assumes all event tables goes into a `event_store` schema. If you are adding these tables to a different schema or into the public default postgres space you will need to modify this sample accordingly.

```sql
CREATE SCHEMA "event_store";

-- Event Table

CREATE TABLE IF NOT EXISTS "event_store"."events" (
	"id" varchar PRIMARY KEY NOT NULL,
	"stream" varchar NOT NULL,
	"type" varchar NOT NULL,
	"data" jsonb NOT NULL,
	"meta" jsonb NOT NULL,
	"recorded" varchar NOT NULL,
	"created" varchar NOT NULL
);

CREATE INDEX IF NOT EXISTS "events_stream_index" ON "event_store"."events" USING btree ("stream");
CREATE INDEX IF NOT EXISTS "events_type_index" ON "event_store"."events" USING btree ("type");
CREATE INDEX IF NOT EXISTS "events_recorded_index" ON "event_store"."events" USING btree ("recorded");
CREATE INDEX IF NOT EXISTS "events_created_index" ON "event_store"."events" USING btree ("created");

-- Relations Table

CREATE TABLE IF NOT EXISTS "event_store"."relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"stream" varchar NOT NULL,
	UNIQUE ("key", "stream")
);

CREATE INDEX IF NOT EXISTS "relations_key_index" ON "event_store"."relations" USING btree ("key");
CREATE INDEX IF NOT EXISTS "relations_stream_index" ON "event_store"."relations" USING btree ("stream");

-- Snapshots Table

CREATE TABLE IF NOT EXISTS "event_store"."snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"stream" varchar NOT NULL,
	"cursor" varchar NOT NULL,
	"state" jsonb NOT NULL,
	UNIQUE ("name", "stream")
);

CREATE INDEX IF NOT EXISTS "snapshots_name_stream_cursor_index" ON "event_store"."snapshots" USING btree ("name","stream","cursor");
```
