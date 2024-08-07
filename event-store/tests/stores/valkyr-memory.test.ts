import "fake-indexeddb/auto";

import { describe } from "@std/testing/bdd";

import { ValkyrEventStore } from "~stores/valkyr/event-store.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

import { type Event, type EventRecord, events, validators } from "./mocks/events.ts";
import testAddEvent from "./store/add-event.ts";
import testCreateSnapshot from "./store/create-snapshot.ts";
import testMakeReducer from "./store/make-reducer.ts";
import testReduce from "./store/reduce.ts";
import testReplayEvents from "./store/replay-events.ts";

const eventStoreFn = async (hooks?: EventStoreHooks<EventRecord>) => getEventStore(hooks);

/*
 |--------------------------------------------------------------------------------
 | Tests
 |--------------------------------------------------------------------------------
 */

describe("Valkyr Event Store (Memory)", () => {
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
  return new ValkyrEventStore<Event>({
    database: "memorydb",
    events,
    validators,
    hooks,
  });
}
