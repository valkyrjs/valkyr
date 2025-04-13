import { afterAll, afterEach, beforeAll, describe } from "@std/testing/bdd";
import { PostgresTestContainer } from "@valkyr/testcontainers/postgres";
import postgres from "postgres";

import { Projector } from "~libraries/projector.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

import { makePostgresEventStore } from "../../adapters/postgres/adapter.ts";
import type { PostgresConnection } from "../../adapters/postgres/connection.ts";
import { type Event, type EventRecord, events, validators } from "./mocks/events.ts";
import testAddEvent from "./store/add-event.ts";
import testAddManyEvents from "./store/add-many-events.ts";
import testCreateSnapshot from "./store/create-snapshot.ts";
import testMakeAggregateReducer from "./store/make-aggregate-reducer.ts";
import testMakeEvent from "./store/make-event.ts";
import testMakeReducer from "./store/make-reducer.ts";
import testOnceProjection from "./store/once-projection.ts";
import testRelationsProvider from "./store/providers/relations.ts";
import testPushAggregate from "./store/push-aggregate.ts";
import testPushManyAggregates from "./store/push-many-aggregates.ts";
import testReduce from "./store/reduce.ts";
import testReplayEvents from "./store/replay-events.ts";

const DB_NAME = "sandbox";

const container = await PostgresTestContainer.start("postgres:17");
const sql = postgres(container.url(DB_NAME));

const eventStoreFn = async (options: { hooks?: EventStoreHooks<EventRecord> } = {}) => getEventStore(sql, options);

/*
 |--------------------------------------------------------------------------------
 | Database
 |--------------------------------------------------------------------------------
 */

beforeAll(async () => {
  await container.create(DB_NAME);
  await sql`CREATE SCHEMA "event_store"`;
  await sql`
    CREATE TABLE IF NOT EXISTS "event_store"."events" (
      "id" varchar PRIMARY KEY NOT NULL,
      "stream" varchar NOT NULL,
      "type" varchar NOT NULL,
      "data" jsonb NOT NULL,
      "meta" jsonb NOT NULL,
      "recorded" varchar NOT NULL,
      "created" varchar NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS "event_store"."relations" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL,
      "stream" varchar NOT NULL,
      UNIQUE ("key", "stream")
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS "event_store"."snapshots" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "stream" varchar NOT NULL,
      "cursor" varchar NOT NULL,
      "state" jsonb NOT NULL,
      UNIQUE ("name", "stream")
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "relations_key_index" ON "event_store"."relations" USING btree ("key")`;
  await sql`CREATE INDEX IF NOT EXISTS "relations_stream_index" ON "event_store"."relations" USING btree ("stream")`;
  await sql`CREATE INDEX IF NOT EXISTS "events_stream_index" ON "event_store"."events" USING btree ("stream")`;
  await sql`CREATE INDEX IF NOT EXISTS "events_type_index" ON "event_store"."events" USING btree ("type")`;
  await sql`CREATE INDEX IF NOT EXISTS "events_recorded_index" ON "event_store"."events" USING btree ("recorded")`;
  await sql`CREATE INDEX IF NOT EXISTS "events_created_index" ON "event_store"."events" USING btree ("created")`;
  await sql`CREATE INDEX IF NOT EXISTS "snapshots_name_stream_cursor_index" ON "event_store"."snapshots" USING btree ("name","stream","cursor")`;
});

afterEach(async () => {
  await container.client(DB_NAME)`TRUNCATE "event_store"."relations","event_store"."events","event_store"."snapshots" CASCADE`;
});

afterAll(async () => {
  await container.stop();
});

/*
 |--------------------------------------------------------------------------------
 | Tests
 |--------------------------------------------------------------------------------
 */

describe("Adapter > Postgres", () => {
  testRelationsProvider(eventStoreFn);
  testAddEvent(eventStoreFn);
  testAddManyEvents(eventStoreFn);
  testCreateSnapshot(eventStoreFn);
  testMakeEvent(eventStoreFn);
  testMakeReducer(eventStoreFn);
  testMakeAggregateReducer(eventStoreFn);
  testReplayEvents(eventStoreFn);
  testReduce(eventStoreFn);
  testOnceProjection(eventStoreFn);

  testPushAggregate(eventStoreFn);
  testPushManyAggregates(eventStoreFn);
});

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function getEventStore(connection: PostgresConnection, { hooks = {} }: { hooks?: EventStoreHooks<EventRecord> }) {
  const store = makePostgresEventStore<Event>({
    connection,
    schema: "event_store",
    events,
    validators,
    hooks,
  });

  const projector = new Projector<EventRecord>();

  if (hooks.onEventsInserted === undefined) {
    store.onEventsInserted(async (records, { batch }) => {
      if (batch !== undefined) {
        await projector.pushMany(batch, records);
      } else {
        for (const record of records) {
          await projector.push(record, { hydrated: false, outdated: false });
        }
      }
    });
  }

  return { store, projector };
}
