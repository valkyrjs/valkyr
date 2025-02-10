import { assertEquals, assertObjectMatch } from "@std/assert";
import { it } from "@std/testing/bdd";

import type { Event, EventRecord } from "../mocks/events.ts";
import { User } from "../mocks/user-aggregate.ts";
import { userReducer } from "../mocks/user-reducer.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".pushAggregate", (getEventStore) => {
  it("should successfully commit pending aggregate events to the event store", async () => {
    const { store } = await getEventStore();

    const user = User.create({ given: "Jane", family: "Doe" }, "jane.doe@fixture.none").setGivenName("John").setEmail("john.doe@fixture.none", "admin");

    assertEquals(user.toPending().length, 3);

    await store.pushAggregate(user);

    assertEquals(user.toPending().length, 0);

    const records = await store.getEventsByStreams([user.id]);

    assertEquals(records.length, 3);

    assertObjectMatch(records[0], { stream: user.id, data: { name: { given: "Jane", family: "Doe" }, email: "jane.doe@fixture.none" } });
    assertObjectMatch(records[1], { stream: user.id, data: { given: "John" } });
    assertObjectMatch(records[2], { stream: user.id, data: { email: "john.doe@fixture.none" }, meta: { auditor: "admin" } });

    const state = await store.reduce({ name: "user", stream: user.id, reducer: userReducer });

    assertObjectMatch(state!, {
      name: {
        given: "John",
        family: "Doe",
      },
      email: "john.doe@fixture.none",
    });
  });
});
