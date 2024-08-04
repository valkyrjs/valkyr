import { assertEquals, assertObjectMatch, assertRejects } from "@std/assert";
import { it } from "@std/testing/bdd";
import { nanoid } from "nanoid";

import { EventDataValidationFailure } from "~libraries/errors.ts";

import type { Event, EventRecord } from "../mocks/events.ts";
import { userReducer } from "../mocks/user-reducer.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".addSequence", (getEventStore) => {
  it("should insert 'user:created', 'user:name:given-set', and 'user:email-set' in a sequence of events", async () => {
    const store = await getEventStore();
    const stream = nanoid();

    store.validator.on("user:email-set", async ({ stream }) => {
      const state = await store.reduce(stream, userReducer);
      if (state === undefined) {
        throw new Error("State does not exist");
      }
      if (state.name.given !== "John") {
        throw new Error("Cannot change 'email', given name is not 'John'");
      }
    });

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

    await store.addEventSequence(events);

    const records = await store.getEventsByStream(stream);

    assertEquals(records.length, 3);

    records.forEach((record, index) => {
      assertObjectMatch(record, events[index]);
    });

    const state = await store.reduce(stream, userReducer);

    assertEquals(state?.name.given, "John");
    assertEquals(state?.email, "john@doe.com");
  });

  it("should not commit any events when insert fails", async () => {
    const store = await getEventStore();
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
      async () => store.addEventSequence(events),
      EventDataValidationFailure,
      new EventDataValidationFailure({}).message,
    );

    const records = await store.getEventsByStream(stream);

    assertEquals(records.length, 0);
  });
});
