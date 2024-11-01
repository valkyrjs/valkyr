import { faker } from "@faker-js/faker";
import { assertEquals, assertLess } from "@std/assert";
import { it } from "@std/testing/bdd";

import { RelationPayload } from "~types/relation.ts";

import type { Event, EventRecord } from "../mocks/events.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".makeEvent", (getEventStore) => {
  it("should make and performantly batch insert a list of events directly", async () => {
    const { store } = await getEventStore();

    const eventsToInsert = [];

    const t0 = performance.now();

    let count = 10_000;
    while (count--) {
      eventsToInsert.push(store.makeEvent({
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

    assertLess((t1 - t0) / 1000, 5);

    const t3 = performance.now();

    await store.events.insertMany(eventsToInsert);

    const t4 = performance.now();

    assertLess((t4 - t3) / 1000, 5);

    const events = await store.getEvents();

    assertEquals(events.length, 10_000);
  });

  it("should performantly create and remove event contexts", async () => {
    const { store } = await getEventStore();

    const relations: RelationPayload[] = [];

    let count = 10_000;
    while (count--) {
      const event = store.makeEvent({
        type: "user:created",
        data: {
          name: {
            given: faker.person.firstName(),
            family: faker.person.lastName(),
          },
          email: faker.internet.email(),
        },
      });
      relations.push({ key: `test:xyz`, stream: event.stream });
    }

    const t0 = performance.now();
    await store.relations.insertMany(relations);
    const tr0 = (performance.now() - t0) / 1000;

    assertEquals((await store.relations.getByKey(`test:xyz`)).length, 10_000);
    assertLess(tr0, 5);

    const t1 = performance.now();
    await store.relations.removeMany(relations);
    const tr1 = (performance.now() - t1) / 1000;

    assertEquals((await store.relations.getByKey(`test:xyz`)).length, 0);
    assertLess(tr1, 10);
  });
});
