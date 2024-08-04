import { assertEquals } from "@std/assert";
import { it } from "@std/testing/bdd";
import { nanoid } from "nanoid";

import type { Event, EventRecord } from "../mocks/events.ts";
import { userReducer } from "../mocks/user-reducer.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".reduce", (getEventStore) => {
  it("should return reduced state", async () => {
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
      type: "user:email-set",
      data: {
        email: "jane.doe@fixture.none",
      },
      meta: {
        auditor: "super",
      },
    });

    const state = await store.reduce(stream, userReducer);

    assertEquals(state, {
      name: { given: "John", family: "Doe" },
      email: "jane.doe@fixture.none",
      active: true,
      posts: { list: [], count: 0 },
    });
  });

  it("should return snapshot if it exists and no new events were found", async () => {
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
      type: "user:email-set",
      data: {
        email: "jane.doe@fixture.none",
      },
      meta: {
        auditor: "super",
      },
    });

    await store.createSnapshot(stream, userReducer);

    const state = await store.reduce(stream, userReducer);

    assertEquals(state, {
      name: { given: "John", family: "Doe" },
      email: "jane.doe@fixture.none",
      active: true,
      posts: { list: [], count: 0 },
    });
  });

  it("should return undefined if stream does not have events", async () => {
    const stream = nanoid();
    const store = await getEventStore();
    const state = await store.reduce(stream, userReducer);

    assertEquals(state, undefined);
  });
});
