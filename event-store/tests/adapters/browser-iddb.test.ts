import "fake-indexeddb/auto";

import { delay } from "@std/async";
import { afterAll, describe } from "@std/testing/bdd";

import { Projector } from "~libraries/projector.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

import { makeBrowserEventStore } from "../../adapters/browser/adapter.ts";
import { type Event, type EventRecord, events, validators } from "./mocks/events.ts";
import testAddEvent from "./store/add-event.ts";
import testCreateSnapshot from "./store/create-snapshot.ts";
import testMakeAggregateReducer from "./store/make-aggregate-reducer.ts";
import testMakeReducer from "./store/make-reducer.ts";
import testPushAggregate from "./store/push-aggregate.ts";
import testPushManyAggregates from "./store/push-many-aggregates.ts";
import testReduce from "./store/reduce.ts";
import testReplayEvents from "./store/replay-events.ts";

const eventStoreFn = async (options: { hooks?: EventStoreHooks<EventRecord> } = {}) => getEventStore(options);

/*
 |--------------------------------------------------------------------------------
 | Lifecycle
 |--------------------------------------------------------------------------------
 */

afterAll(async () => {
  await delay(250);
});

/*
 |--------------------------------------------------------------------------------
 | Tests
 |--------------------------------------------------------------------------------
 */

describe("Adapter > Browser (IndexedDb)", () => {
  testAddEvent(eventStoreFn);
  testCreateSnapshot(eventStoreFn);
  testMakeReducer(eventStoreFn);
  testMakeAggregateReducer(eventStoreFn);
  testReplayEvents(eventStoreFn);
  testReduce(eventStoreFn);

  testPushAggregate(eventStoreFn);
  testPushManyAggregates(eventStoreFn);
});

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function getEventStore({ hooks = {} }: { hooks?: EventStoreHooks<EventRecord> }) {
  const store = makeBrowserEventStore<Event>({
    database: "indexeddb",
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
