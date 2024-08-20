import { resolve } from "node:path";

import { afterAll, describe } from "@std/testing/bdd";
import { Database } from "sqlite";

import { migrate, SQLiteEventStore } from "~stores/sqlite/event-store.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

import { type Event, type EventRecord, events, validators } from "./mocks/events.ts";
import testAddEvent from "./store/add-event.ts";
import testCreateSnapshot from "./store/create-snapshot.ts";
import testMakeEvent from "./store/make-event.ts";
import testMakeReducer from "./store/make-reducer.ts";
import testReduce from "./store/reduce.ts";
import testReplayEvents from "./store/replay-events.ts";

const DB_MIGRATE = resolve(import.meta.dirname!, "sqlite-migrate");

const eventStoreFn = async (hooks?: EventStoreHooks<EventRecord>) => getEventStore(hooks);

/*
 |--------------------------------------------------------------------------------
 | Database
 |--------------------------------------------------------------------------------
 */

afterAll(async () => {
  await Deno.remove(DB_MIGRATE, { recursive: true });
});

/*
 |--------------------------------------------------------------------------------
 | Tests
 |--------------------------------------------------------------------------------
 */

describe("SQLiteEventStore", () => {
  testAddEvent(eventStoreFn);
  testCreateSnapshot(eventStoreFn);
  testMakeEvent(eventStoreFn);
  testMakeReducer(eventStoreFn);
  testReplayEvents(eventStoreFn);
  testReduce(eventStoreFn);
});

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function getEventStore(hooks?: EventStoreHooks<EventRecord>) {
  const database = new Database(":memory:");
  const store = new SQLiteEventStore<Event>({
    database: () => database,
    events,
    validators,
    hooks,
  });
  await migrate(database, DB_MIGRATE);
  return store;
}
