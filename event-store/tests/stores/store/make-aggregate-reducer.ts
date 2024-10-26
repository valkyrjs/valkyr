import { assertEquals, assertRejects } from "@std/assert";
import { it } from "@std/testing/bdd";
import { nanoid } from "nanoid";

import { EventValidationFailure } from "~libraries/errors.ts";

import type { Event, EventRecord } from "../mocks/events.ts";
import { userAggregateReducer } from "../mocks/user-aggregate.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".makeAggregateReducer", (getEventStore) => {
  it("should reduce a user", async () => {
    const store = await getEventStore();
    const stream = nanoid();

    await store.addEvent({
      stream,
      type: "user:created",
      data: {
        name: {
          given: "John",
          family: "Doe",
        },
        email: "john.doe@fixture.none",
      },
    });

    await store.addEvent({
      stream,
      type: "user:name:given-set",
      data: {
        given: "Jane",
      },
    });

    await store.createSnapshot(stream, userAggregateReducer);

    await store.addEvent({
      stream,
      type: "user:name:family-set",
      data: {
        family: "Smith",
      },
    });

    await store.addEvent({
      stream,
      type: "user:email-set",
      data: {
        email: "jane.smith@fixture.none",
      },
      meta: {
        auditor: "system",
      },
    });

    const user = await store.reduce(stream, userAggregateReducer);
    if (user === undefined) {
      throw new Error("Expected user to exist");
    }

    assertEquals(user.fullName(), "Jane Smith");
    assertEquals(user.email, "jane.smith@fixture.none");
  });

  it("should create a 'user' reducer and reject a 'user:email-set' event", async () => {
    const store = await getEventStore();
    const stream = nanoid();

    store.validator.on("user:email-set", async (record) => {
      const user = await store.reduce(stream, userAggregateReducer);
      if (user === undefined) {
        throw new Error("Event stream does not exist");
      }
      if (user.email === record.data.email) {
        throw new Error("Email has not changed");
      }
    });

    await store.addEvent({
      stream,
      type: "user:created",
      data: {
        name: {
          given: "John",
          family: "Doe",
        },
        email: "john.doe@fixture.none",
      },
    });

    await assertRejects(
      async () =>
        await store.addEvent({
          stream,
          type: "user:email-set",
          data: {
            email: "john.doe@fixture.none",
          },
          meta: {
            auditor: "super",
          },
        }),
      EventValidationFailure,
      "Email has not changed",
    );
  });
});
