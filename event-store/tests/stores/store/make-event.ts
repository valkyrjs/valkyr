import { assertEquals, assertLess } from "@std/assert";
import { it } from "@std/testing/bdd";
import { faker } from "faker";

import type { Event, EventRecord } from "../mocks/events.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".makeEvent", (getEventStore) => {
  it("should make and performantly batch insert a list of events directly", async () => {
    const eventStore = await getEventStore();

    const eventsToInsert = [];

    const t0 = performance.now();

    let count = 10_000;
    while (count--) {
      eventsToInsert.push(eventStore.makeEvent({
        type: "user:created",
        data: {
          name: {
            given: faker.person.firstName(),
            family: faker.person.lastName(),
          },
          email: faker.internet.email(),
        },
      }));
    }

    const t1 = performance.now();

    assertLess((t1 - t0) / 1000, 1);

    const t3 = performance.now();

    await eventStore.events.insertBatch(eventsToInsert);

    const t4 = performance.now();

    assertLess((t4 - t3) / 1000, 1);

    const events = await eventStore.getEvents();

    assertEquals(events.length, 10_000);
  });
});
