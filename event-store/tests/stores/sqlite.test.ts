import { resolve } from "node:path";

import { afterAll, describe } from "@std/testing/bdd";
import { Database } from "sqlite";

import { migrate, SQLiteEventStore } from "~stores/sqlite/event-store.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

import { testEventStoreMethods } from "./helpers/event-store.bdd.ts";
import { type Event, type EventRecord, events, validators } from "./mocks/events.ts";

const DB_MIGRATE = resolve(import.meta.dirname!, "sqlite-migrate");

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
  testEventStoreMethods(async (hooks?: EventStoreHooks<EventRecord>) => getEventStore(hooks));
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
