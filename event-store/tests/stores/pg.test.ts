import { resolve } from "node:path";

import { afterAll, afterEach, beforeAll, describe } from "@std/testing/bdd";
import { PostgresTestContainer } from "@valkyr/testcontainers/postgres";
import postgres from "postgres";

import { migrate, PGEventStore } from "~stores/pg/event-store.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

import { type Event, type EventRecord, events, validators } from "./mocks/events.ts";
import testAddEvent from "./store/add-event.ts";
import testAddSequence from "./store/add-sequence.ts";
import testCreateSnapshot from "./store/create-snapshot.ts";
import testMakeReducer from "./store/make-reducer.ts";
import testReduce from "./store/reduce.ts";
import testReplayEvents from "./store/replay-events.ts";

const DB_NAME = "sandbox";
const DB_MIGRATE = resolve(import.meta.dirname!, "pg-migrate");

const container = await PostgresTestContainer.start("postgres:14");

const eventStoreFn = async (hooks?: EventStoreHooks<EventRecord>) => getEventStore(container.url(DB_NAME), hooks);

/*
 |--------------------------------------------------------------------------------
 | Database
 |--------------------------------------------------------------------------------
 */

beforeAll(async () => {
  await container.create(DB_NAME);
  await migrate(container.client(DB_NAME), DB_MIGRATE);
});

afterEach(async () => {
  await container.client(DB_NAME)`TRUNCATE "event_store"."contexts","event_store"."events","event_store"."snapshots" CASCADE`;
});

afterAll(async () => {
  await Deno.remove(DB_MIGRATE, { recursive: true });
  await container.stop();
});

/*
 |--------------------------------------------------------------------------------
 | Tests
 |--------------------------------------------------------------------------------
 */

describe("PGEventStore", () => {
  testAddEvent(eventStoreFn);
  testAddSequence(eventStoreFn);
  testCreateSnapshot(eventStoreFn);
  testMakeReducer(eventStoreFn);
  testReplayEvents(eventStoreFn);
  testReduce(eventStoreFn);
});

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function getEventStore(databaseUrl: string, hooks: EventStoreHooks<EventRecord> = {}) {
  return new PGEventStore<Event>({
    database: () => postgres(databaseUrl),
    events,
    validators,
    hooks,
  });
}
