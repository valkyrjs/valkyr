import { afterAll, afterEach, beforeAll, describe } from "@std/testing/bdd";
import type { PostgresConnection } from "@valkyr/drizzle";
import { PostgresTestContainer } from "@valkyr/testcontainers/postgres";

import { migrate, PostgresEventStore } from "~stores/postgres/event-store.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

import { type Event, type EventRecord, events, validators } from "./mocks/events.ts";
import testAddEvent from "./store/add-event.ts";
import testAddSequence from "./store/add-sequence.ts";
import testCreateSnapshot from "./store/create-snapshot.ts";
import testMakeAggregateReducer from "./store/make-aggregate-reducer.ts";
import testMakeEvent from "./store/make-event.ts";
import testMakeReducer from "./store/make-reducer.ts";
import testReduce from "./store/reduce.ts";
import testReplayEvents from "./store/replay-events.ts";

const DB_NAME = "sandbox";

const container = await PostgresTestContainer.start("postgres:14");

const eventStoreFn = async (hooks?: EventStoreHooks<EventRecord>) => getEventStore(container.url(DB_NAME), hooks);

/*
 |--------------------------------------------------------------------------------
 | Database
 |--------------------------------------------------------------------------------
 */

beforeAll(async () => {
  await container.create(DB_NAME);
  await migrate(container.client(DB_NAME));
});

afterEach(async () => {
  await container.client(DB_NAME)`TRUNCATE "event_store"."contexts","event_store"."events","event_store"."snapshots" CASCADE`;
});

afterAll(async () => {
  await container.stop();
});

/*
 |--------------------------------------------------------------------------------
 | Tests
 |--------------------------------------------------------------------------------
 */

describe("PostgresEventStore", () => {
  testAddEvent(eventStoreFn);
  testAddSequence(eventStoreFn);
  testCreateSnapshot(eventStoreFn);
  testMakeEvent(eventStoreFn);
  testMakeReducer(eventStoreFn);
  testMakeAggregateReducer(eventStoreFn);
  testReplayEvents(eventStoreFn);
  testReduce(eventStoreFn);
});

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function getEventStore(database: PostgresConnection, hooks: EventStoreHooks<EventRecord> = {}) {
  return new PostgresEventStore<Event>({ database, events, validators, hooks });
}
