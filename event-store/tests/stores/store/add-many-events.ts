import { assertEquals, assertObjectMatch, assertRejects } from "@std/assert";
import { it } from "@std/testing/bdd";
import { nanoid } from "nanoid";

import { EventParserError } from "../../../mod.ts";
import type { Event, EventRecord } from "../mocks/events.ts";
import { userReducer } from "../mocks/user-reducer.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".addSequence", (getEventStore) => {
  it("should insert 'user:created', 'user:name:given-set', and 'user:email-set' in a sequence of events", async () => {
    const { store } = await getEventStore();
    const stream = nanoid();

    const events = [
      {
        stream,
        type: "user:created",
        data: {
          name: {
            given: "Jane",
            family: "Doe",
          },
          email: "jane.doe@fixture.none",
        },
      } as const,
      {
        stream,
        type: "user:name:given-set",
        data: {
          given: "John",
        },
      } as const,
      {
        stream,
        type: "user:email-set",
        data: {
          email: "john@doe.com",
        },
        meta: {
          auditor: "admin",
        },
      } as const,
    ];

    await store.addManyEvents(events);

    const records = await store.getEventsByStreams([stream]);

    assertEquals(records.length, 3);

    records.forEach((record, index) => {
      assertObjectMatch(record, events[index]);
    });

    const state = await store.reduce({ stream, reducer: userReducer });

    assertEquals(state?.name.given, "John");
    assertEquals(state?.email, "john@doe.com");
  });

  it("should not commit any events when insert fails", async () => {
    const { store } = await getEventStore();
    const stream = nanoid();

    const events = [
      {
        stream,
        type: "user:created",
        data: {
          name: {
            given: "Jane",
            family: "Doe",
          },
          email: "jane.doe@fixture.none",
        },
      } as const,
      {
        stream,
        type: "user:name:given-set",
        data: {
          givens: "John",
        },
      } as any,
      {
        stream,
        type: "user:email-set",
        data: {
          email: "john@doe.com",
        },
        meta: {
          auditor: "admin",
        },
      } as const,
    ];

    await assertRejects(
      async () => store.addManyEvents(events),
      EventParserError,
      new EventParserError({}).message,
    );

    const records = await store.getEventsByStreams([stream]);

    assertEquals(records.length, 0);
  });
});
