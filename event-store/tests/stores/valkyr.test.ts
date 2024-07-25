import { describe } from "@std/testing/bdd";

import { ValkyrEventStore } from "~stores/valkyr/event-store.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

import { testEventStoreMethods } from "./helpers/event-store.bdd.ts";
import { type Event, type EventRecord, events, validators } from "./mocks/events.ts";

/*
 |--------------------------------------------------------------------------------
 | Tests
 |--------------------------------------------------------------------------------
 */

describe("Valkyr Event Store", () => {
  testEventStoreMethods(async (hooks?: EventStoreHooks<EventRecord>) => getEventStore(hooks), {
    skipSequence: true,
  });
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
