import { assertEquals } from "@std/assert";
import { it } from "@std/testing/bdd";
import { nanoid } from "nanoid";

import type { Event, EventRecord } from "../mocks/events.ts";
import { userAggregateReducer } from "../mocks/user-aggregate.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".makeAggregateReducer", (getEventStore) => {
  it("should reduce a user", async () => {
    const { store } = await getEventStore();
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

    await store.createSnapshot({ stream, reducer: userAggregateReducer });

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

    const user = await store.reduce({ stream, reducer: userAggregateReducer });
    if (user === undefined) {
      throw new Error("Expected user to exist");
    }

    assertEquals(user.fullName(), "Jane Smith");
    assertEquals(user.email, "jane.smith@fixture.none");
  });
});
