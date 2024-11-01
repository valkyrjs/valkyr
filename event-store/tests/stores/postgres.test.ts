import { afterAll, afterEach, beforeAll, describe } from "@std/testing/bdd";
import type { PostgresConnection } from "@valkyr/drizzle";
import { PostgresTestContainer } from "@valkyr/testcontainers/postgres";

import { Projector } from "~libraries/projector.ts";
import { migrate } from "~stores/postgres/database.ts";
import { PostgresEventStore } from "~stores/postgres/event-store.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

import { type Event, type EventRecord, events, validators } from "./mocks/events.ts";
import testAddEvent from "./store/add-event.ts";
import testAddManyEvents from "./store/add-many-events.ts";
import testCreateSnapshot from "./store/create-snapshot.ts";
import testMakeAggregateReducer from "./store/make-aggregate-reducer.ts";
import testMakeEvent from "./store/make-event.ts";
import testMakeReducer from "./store/make-reducer.ts";
import testReduce from "./store/reduce.ts";
import testReplayEvents from "./store/replay-events.ts";

const DB_NAME = "sandbox";

const container = await PostgresTestContainer.start("postgres:14");

const eventStoreFn = async (options: { hooks?: EventStoreHooks<EventRecord> } = {}) => getEventStore(container.url(DB_NAME), options);

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

describe("PostgresEventStore", () => {
  testAddEvent(eventStoreFn);
  testAddManyEvents(eventStoreFn);
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

async function getEventStore(database: PostgresConnection, { hooks = {} }: { hooks?: EventStoreHooks<EventRecord> }) {
  const store = new PostgresEventStore<Event>({ database, events, validators, hooks });

  const projector = new Projector<EventRecord>();

  if (hooks.onEventsInserted === undefined) {
    store.onEventsInserted(async (records, { batch }) => {
      if (batch !== undefined) {
        return projector.pushMany(batch, records);
      }
      for (const record of records) {
        await projector.push(record, { hydrated: false, outdated: false });
      }
    });
  }

  return { store, projector };
}
