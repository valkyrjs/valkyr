import "fake-indexeddb/auto";

import { delay } from "@std/async";
import { afterAll, describe } from "@std/testing/bdd";

import type { EventStoreHooks } from "~types/event-store.ts";

import { BrowserEventStore } from "../../stores/browser/event-store.ts";
import { type Event, type EventRecord, events, validators } from "./mocks/events.ts";
import testAddEvent from "./store/add-event.ts";
import testCreateSnapshot from "./store/create-snapshot.ts";
import testMakeReducer from "./store/make-reducer.ts";
import testReduce from "./store/reduce.ts";
import testReplayEvents from "./store/replay-events.ts";

const eventStoreFn = async (hooks?: EventStoreHooks<EventRecord>) => getEventStore(hooks);

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

describe("Browser Event Store (IndexedDB)", () => {
  testAddEvent(eventStoreFn);
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

function getEventStore(hooks?: EventStoreHooks<EventRecord>) {
  return new BrowserEventStore<Event>({
    database: "indexedb",
    events,
    validators,
    hooks,
  });
}
