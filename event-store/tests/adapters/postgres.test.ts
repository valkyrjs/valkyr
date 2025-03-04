import { afterAll, afterEach, beforeAll, describe } from "@std/testing/bdd";
import { PostgresTestContainer } from "@valkyr/testcontainers/postgres";

import { Projector } from "~libraries/projector.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

import { makePostgresEventStore } from "../../adapters/postgres/adapter.ts";
import { PostgresConnection } from "../../adapters/postgres/database.ts";
import { migrate } from "../../adapters/postgres/migrations/migrate.ts";
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
