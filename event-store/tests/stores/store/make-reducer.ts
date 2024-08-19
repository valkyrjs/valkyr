import { assertEquals, assertRejects } from "@std/assert";
import { it } from "@std/testing/bdd";
import { nanoid } from "nanoid";

import { EventValidationFailure } from "~libraries/errors.ts";

import type { Event, EventRecord } from "../mocks/events.ts";
import { userFilteredReducer } from "../mocks/user-filtered-reducer.ts";
import { userPostReducer } from "../mocks/user-posts-reducer.ts";
import { userReducer } from "../mocks/user-reducer.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".makeReducer", (getEventStore) => {
  it("should create a 'user' reducer and reject a 'user:email-set' event", async () => {
    const store = await getEventStore();
    const stream = nanoid();

    store.validator.on("user:email-set", async (record) => {
      const user = await store.reduce(stream, userReducer);
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

  it("should create a 'user' reducer and only reduce filtered events", async () => {
    const store = await getEventStore();

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

    const state = await store.reduce(streamA, userFilteredReducer);

    assertEquals(state?.name, { given: "John", family: "Doe" });
    assertEquals(state?.email, "jane.doe@fixture.none");
  });

  it("should create a 'post:count' reducer and retrieve post correct post count", async () => {
    const store = await getEventStore();
    const auditor = nanoid();

    store.contextor.register("post:created", async ({ meta: { auditor } }) => [{
      key: `user:${auditor}:posts`,
      op: "insert",
    }]);

    const post1 = await store.addEvent({ type: "post:created", data: { title: "Post #1", body: "Sample #1" }, meta: { auditor } });
    const post2 = await store.addEvent({ type: "post:created", data: { title: "Post #2", body: "Sample #2" }, meta: { auditor } });
    await store.addEvent({ stream: post2, type: "post:removed" });
    const post3 = await store.addEvent({ type: "post:created", data: { title: "Post #3", body: "Sample #3" }, meta: { auditor } });

    const events = await store.getEventsByContext(`user:${auditor}:posts`);

    assertEquals(events.length, 4);

    const state = await store.reduce(`user:${auditor}:posts`, userPostReducer);

    assertEquals(state?.posts, [{ id: post1, author: auditor }, { id: post3, author: auditor }]);
    assertEquals(state?.count, 2);
  });

  it("should throw error on adding more than a single post per user", async () => {
    const store = await getEventStore();
    const auditor1 = nanoid();
    const auditor2 = nanoid();

    store.contextor.register("post:created", async ({ meta: { auditor } }) => [{
      key: `user:${auditor}:posts`,
      op: "insert",
    }]);

    store.validator.on("post:created", async ({ meta: { auditor } }) => {
      const state = await store.reduce(`user:${auditor}:posts`, userPostReducer);
      if (state && state.count > 0) {
        throw new Error("Can only have 1 post per user");
      }
    });

    const postId = await store.addEvent({ type: "post:created", data: { title: "Post #1", body: "Sample #1" }, meta: { auditor: auditor1 } });
    await store.addEvent({ type: "post:created", data: { title: "Post #2", body: "Sample #2" }, meta: { auditor: auditor2 } });

    await assertRejects(
      async () => store.addEvent({ type: "post:created", data: { title: "Post #3", body: "Sample #3" }, meta: { auditor: auditor1 } }),
      Error,
      "Can only have 1 post per user",
    );

    const events = await store.getEventsByContext(`user:${auditor1}:posts`);

    assertEquals(events.length, 1);

    const state = await store.reduce(`user:${auditor1}:posts`, userPostReducer);

    assertEquals(state?.posts, [{ id: postId, author: auditor1 }]);
    assertEquals(state?.count, 1);
  });
});
