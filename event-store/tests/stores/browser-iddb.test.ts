import "fake-indexeddb/auto";

import { delay } from "@std/async";
import { afterAll, describe } from "@std/testing/bdd";

import { Projector } from "~libraries/projector.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

import { BrowserEventStore } from "../../stores/browser/event-store.ts";
import { type Event, type EventRecord, events, validators } from "./mocks/events.ts";
import testAddEvent from "./store/add-event.ts";
import testCreateSnapshot from "./store/create-snapshot.ts";
import testMakeAggregateReducer from "./store/make-aggregate-reducer.ts";
import testMakeReducer from "./store/make-reducer.ts";
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

describe("Browser Event Store (IndexedDB)", () => {
  testAddEvent(eventStoreFn);
  testCreateSnapshot(eventStoreFn);
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

function getEventStore({ hooks = {} }: { hooks?: EventStoreHooks<EventRecord> }) {
  const store = new BrowserEventStore<Event>({
    database: "indexedb",
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
