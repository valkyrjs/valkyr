import { assertEquals } from "@std/assert";
import { it } from "@std/testing/bdd";

import type { Event, EventRecord } from "../mocks/events.ts";
import { User } from "../mocks/user-aggregate.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".makeAggregateReducer", (getEventStore) => {
  it("should reduce a user", async () => {
    const { store } = await getEventStore();

    const userA = await User
      .create({ given: "John", family: "Doe" }, "john.doe@fixture.none", store)
      .setGivenName("Jane")
      .commit(store);

    await userA.snapshot();

    await userA
      .setFamilyName("Smith")
      .setEmail("jane.smith@fixture.none", "system")
      .commit(store);

    const userB = await User.getById(userA.id, store);
    if (userB === undefined) {
      throw new Error("Expected user to exist");
    }

    assertEquals(userB.fullName(), "Jane Smith");
    assertEquals(userB.email, "jane.smith@fixture.none");
  });
});
