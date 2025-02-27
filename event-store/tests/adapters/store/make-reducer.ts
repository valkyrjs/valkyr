import { assertEquals } from "@std/assert";
import { it } from "@std/testing/bdd";
import { nanoid } from "nanoid";

import { makeId } from "~libraries/nanoid.ts";

import type { Event, EventRecord } from "../mocks/events.ts";
import { userPostReducer } from "../mocks/user-posts-reducer.ts";
import { userReducer } from "../mocks/user-reducer.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".makeReducer", (getEventStore) => {
  it("should create a 'user' reducer and only reduce filtered events", async () => {
    const { store } = await getEventStore();

    const streamA = nanoid();
    const streamB = nanoid();

    await store.addEvent({
      stream: streamA,
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
      stream: streamB,
      type: "user:created",
      data: {
        name: {
          given: "Peter",
          family: "Parker",
        },
        email: "peter.parker@fixture.none",
      },
    });

    await store.addEvent({
      stream: streamA,
      type: "user:name:given-set",
      data: {
        given: "Jane",
      },
    });

    await store.addEvent({
      stream: streamA,
      type: "user:email-set",
      data: {
        email: "jane.doe@fixture.none",
      },
      meta: {
        auditor: "system",
      },
    });

    await store.addEvent({
      stream: streamB,
      type: "user:email-set",
      data: {
        email: "spiderman@fixture.none",
      },
      meta: {
        auditor: "system",
      },
    });

    const state = await store.reduce({ name: "user", stream: streamA, reducer: userReducer, filter: { types: ["user:created", "user:email-set"] } });

    assertEquals(state?.name, { given: "John", family: "Doe" });
    assertEquals(state?.email, "jane.doe@fixture.none");
  });

  it("should create a 'post:count' reducer and retrieve post correct post count", async () => {
    const { store, projector } = await getEventStore();
    const auditor = nanoid();

    projector.on("post:created", async ({ stream, meta: { auditor } }) => {
      await store.relations.insert(`user:${auditor}:posts`, stream);
    });

    const post1 = makeId();
    const post2 = makeId();
    const post3 = makeId();

    await store.addEvent({ stream: post1, type: "post:created", data: { title: "Post #1", body: "Sample #1" }, meta: { auditor } });
    await store.addEvent({ stream: post2, type: "post:created", data: { title: "Post #2", body: "Sample #2" }, meta: { auditor } });
    await store.addEvent({ stream: post2, type: "post:removed" });
    await store.addEvent({ stream: post3, type: "post:created", data: { title: "Post #3", body: "Sample #3" }, meta: { auditor } });

    const events = await store.getEventsByRelations([`user:${auditor}:posts`]);

    assertEquals(events.length, 4);

    const state = await store.reduce({ name: "user", relation: `user:${auditor}:posts`, reducer: userPostReducer });

    assertEquals(state?.posts, [{ id: post1, author: auditor }, { id: post3, author: auditor }]);
    assertEquals(state?.count, 2);
  });
});
