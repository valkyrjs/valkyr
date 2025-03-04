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

    const state = await store.reduce({ name: "user", stream, reducer: userReducer });

    assertEquals(state?.name.given, "John");
    assertEquals(state?.email, "john@doe.com");
  });

  it("should not commit any events when insert fails", async () => {
    const { store } = await getEventStore();
    const stream = nanoid();

    const badEvent = store.makeEvent({
      stream,
      type: "user:name:given-set",
      data: {
        givens: "John",
      },
    } as any);

    await assertRejects(
      async () =>
        store.pushManyEvents([
          store.makeEvent({
            stream,
            type: "user:created",
            data: {
              name: {
                given: "Jane",
                family: "Doe",
              },
              email: "jane.doe@fixture.none",
            },
          }),
          badEvent,
          store.makeEvent({
            stream,
            type: "user:email-set",
            data: {
              email: "john@doe.com",
            },
            meta: {
              auditor: "admin",
            },
          }),
        ]),
      EventParserError,
      new EventParserError(badEvent, [
        {
          "given": [
            "Required",
          ],
        },
      ]).message,
    );

    const records = await store.getEventsByStreams([stream]);

    assertEquals(records.length, 0);
  });
});
