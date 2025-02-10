import { assertEquals, assertObjectMatch } from "@std/assert";
import { it } from "@std/testing/bdd";

import type { Event, EventRecord } from "../mocks/events.ts";
import { User } from "../mocks/user-aggregate.ts";
import { userReducer } from "../mocks/user-reducer.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".pushManyAggregates", (getEventStore) => {
  it("should successfully commit pending aggregates events to the event store", async () => {
    const { store } = await getEventStore();

    const userA = User.create({ given: "Jane", family: "Doe" }, "jane.doe@fixture.none").setGivenName("John").setEmail("john.doe@fixture.none", "admin");
    const userB = User.create({ given: "Peter", family: "Doe" }, "peter.doe@fixture.none").setGivenName("Barry").setEmail("barry.doe@fixture.none", "admin");

    assertEquals(userA.toPending().length, 3);
    assertEquals(userB.toPending().length, 3);

    await store.pushManyAggregates([userA, userB]);

    assertEquals(userA.toPending().length, 0);
    assertEquals(userB.toPending().length, 0);

    const records = await store.getEventsByStreams([userA.id, userB.id]);

    assertEquals(records.length, 6);

    assertObjectMatch(records[0], { stream: userA.id, data: { name: { given: "Jane", family: "Doe" }, email: "jane.doe@fixture.none" } });
    assertObjectMatch(records[1], { stream: userA.id, data: { given: "John" } });
    assertObjectMatch(records[2], { stream: userA.id, data: { email: "john.doe@fixture.none" }, meta: { auditor: "admin" } });
    assertObjectMatch(records[3], { stream: userB.id, data: { name: { given: "Peter", family: "Doe" }, email: "peter.doe@fixture.none" } });
    assertObjectMatch(records[4], { stream: userB.id, data: { given: "Barry" } });
    assertObjectMatch(records[5], { stream: userB.id, data: { email: "barry.doe@fixture.none" }, meta: { auditor: "admin" } });

    const stateA = await store.reduce({ name: "user", stream: userA.id, reducer: userReducer });
    const stateB = await store.reduce({ name: "user", stream: userB.id, reducer: userReducer });

    assertObjectMatch(stateA!, {
      name: {
        given: "John",
        family: "Doe",
      },
      email: "john.doe@fixture.none",
    });

    assertObjectMatch(stateB!, {
      name: {
        given: "Barry",
        family: "Doe",
      },
      email: "barry.doe@fixture.none",
    });
  });
});
