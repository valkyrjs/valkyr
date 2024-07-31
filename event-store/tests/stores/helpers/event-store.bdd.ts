import { assertEquals, assertNotEquals, assertObjectMatch, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { nanoid } from "nanoid";

import { EventDataValidationFailure, EventInsertionFailure, EventValidationFailure } from "~libraries/errors.ts";
import type { PGEventStore } from "~stores/pg/event-store.ts";
import type { SQLiteEventStore } from "~stores/sqlite/event-store.ts";
import type { ValkyrEventStore } from "~stores/valkyr/event-store.ts";
import type { EventStoreHooks } from "~types/event-store.ts";

import { CustomServiceError } from "../mocks/errors.ts";
import type { Event, EventRecord } from "../mocks/events.ts";
import { userFilteredReducer } from "../mocks/user-filtered-reducer.ts";
import { userPostReducer } from "../mocks/user-posts-reducer.ts";
import { userReducer } from "../mocks/user-reducer.ts";

export function testEventStoreMethods(
  getEventStore: (
    hooks?: EventStoreHooks<EventRecord>,
  ) => Promise<PGEventStore<Event> | SQLiteEventStore<Event> | ValkyrEventStore<Event>>,
  options: { skipSequence: boolean } = { skipSequence: false },
) {
  describe(".addEvent", () => {
    it("should throw a 'EventValidationFailure' on data validation error", async () => {
      const store = await getEventStore();

      await assertRejects(
        async () =>
          store.addEvent({
            type: "user:created",
            data: {
              name: {
                given: "John",
                familys: "Doe",
              },
              email: "john.doe@fixture.none",
            },
          } as any),
        EventDataValidationFailure,
        new EventDataValidationFailure({}).message,
      );
    });

    it("should throw a 'CustomServiceError' using 'beforeEventError' on data validation error", async () => {
      const store = await getEventStore({
        async beforeEventError() {
          return new CustomServiceError();
        },
      });

      await assertRejects(
        async () =>
          store.addEvent({
            type: "user:created",
            data: {
              name: {
                given: "John",
                familys: "Doe",
              },
              email: "john.doe@fixture.none",
            },
          } as any),
        CustomServiceError,
        "Custom Error",
      );
    });

    it("should throw a 'EventValidationFailure' on event validation error", async () => {
      const store = await getEventStore();

      store.validator.on("user:created", async () => {
        throw new Error("Test Failure");
      });

      await assertRejects(
        async () =>
          store.addEvent({
            type: "user:created",
            data: {
              name: {
                given: "John",
                family: "Doe",
              },
              email: "john.doe@fixture.none",
            },
          }),
        EventValidationFailure,
        "Test Failure",
      );
    });

    it("should throw a 'CustomServiceError' using 'beforeEventError' on event validation error", async () => {
      const store = await getEventStore({
        async beforeEventError(error) {
          return new CustomServiceError(error.message);
        },
      });

      store.validator.on("user:created", async () => {
        throw new Error("Test Failure");
      });

      await assertRejects(
        async () =>
          store.addEvent({
            type: "user:created",
            data: {
              name: {
                given: "John",
                family: "Doe",
              },
              email: "john.doe@fixture.none",
            },
          }),
        CustomServiceError,
        "Test Failure",
      );
    });

    it("should throw a 'EventInsertionFailure' on event insertion error", async () => {
      const store = await getEventStore();

      store.events.insert = async () => {
        throw new Error("Fake Insert Error");
      };

      await assertRejects(
        async () =>
          store.addEvent({
            type: "user:created",
            data: {
              name: {
                given: "John",
                family: "Doe",
              },
              email: "john.doe@fixture.none",
            },
          }),
        EventInsertionFailure,
        new EventInsertionFailure().message,
      );
    });

    it("should throw a 'CustomServiceError' using 'beforeEventError' on event insertion error", async () => {
      const store = await getEventStore({
        async beforeEventError(error) {
          return new CustomServiceError(error.message);
        },
      });

      store.events.insert = async () => {
        throw new Error("Fake Insert Error");
      };

      await assertRejects(
        async () =>
          store.addEvent({
            type: "user:created",
            data: {
              name: {
                given: "John",
                family: "Doe",
              },
              email: "john.doe@fixture.none",
            },
          }),
        CustomServiceError,
        "Fake Insert Error",
      );
    });

    it("should insert and project 'user:created' event", async () => {
      const store = await getEventStore();

      const event = {
        type: "user:created",
        data: {
          name: {
            given: "John",
            family: "Doe",
          },
          email: "john.doe@fixture.none",
        },
      } as const;

      let projectedResult: string = "";

      store.projector.on("user:created", async (record) => {
        projectedResult = `${record.data.name.given} ${record.data.name.family} | ${record.data.email}`;
      });

      const stream = await store.addEvent(event);

      assertObjectMatch(await store.events.getByStream(stream).then((rows) => rows[0]), event);
      assertEquals(projectedResult, "John Doe | john.doe@fixture.none");
    });

    it("should insert 'user:meta-added' event", async () => {
      const store = await getEventStore();

      const event = {
        type: "user:meta-added",
        data: {
          meta: {
            foo: "bar",
          },
        },
      } as const;

      let projectedResult: string = "";

      store.projector.on("user:meta-added", async (record) => {
        projectedResult = record.data.meta.foo;
      });

      const stream = await store.addEvent(event);

      assertObjectMatch(await store.events.getByStream(stream).then((rows) => rows[0]), event);
      assertEquals(projectedResult, "bar");
    });

    it("should insert 'user:created' and ignore 'project' error", async () => {
      const store = await getEventStore();

      const event = {
        type: "user:created",
        data: {
          name: {
            given: "John",
            family: "Doe",
          },
          email: "john.doe@fixture.none",
        },
      } as const;

      store.projector.on("user:created", async () => {
        throw new Error();
      });

      const stream = await store.addEvent(event);

      assertObjectMatch(await store.events.getByStream(stream).then((rows) => rows[0]), event);
    });

    it("should insert 'user:created' and log 'project' error via 'afterEventError'", async () => {
      let projectionErrorLog: string = "";

      const store = await getEventStore({
        afterEventError(error, record) {
          projectionErrorLog = `${record.type} | ${error.message}`;
        },
      });

      const event = {
        type: "user:created",
        data: {
          name: {
            given: "John",
            family: "Doe",
          },
          email: "john.doe@fixture.none",
        },
      } as const;

      store.projector.on("user:created", async (record) => {
        throw new Error(record.data.email);
      });

      const stream = await store.addEvent(event);

      assertObjectMatch(await store.events.getByStream(stream).then((rows) => rows[0]), event);
      assertEquals(projectionErrorLog, "user:created | john.doe@fixture.none");
    });

    it("should insert 'user:created' and add it to 'tenant:xyz' context", async () => {
      const store = await getEventStore();

      store.contextor.register("user:created", () => [
        {
          key: "tenant:xyz",
          op: "insert",
        },
      ]);

      await store.addEvent({
        type: "user:created",
        data: {
          name: {
            given: "John",
            family: "Doe",
          },
          email: "john.doe@fixture.none",
        },
      });

      const res1 = await store.getEventsByContext("tenant:xyz");

      assertEquals(res1.length, 1);

      await store.addEvent({
        type: "user:created",
        data: {
          name: {
            given: "Jane",
            family: "Doe",
          },
          email: "jane.doe@fixture.none",
        },
      });

      const res2 = await store.getEventsByContext("tenant:xyz");

      assertEquals(res2.length, 2);
    });

    it("should insert 'user:email-set' and remove it from 'tenant:xyz' context", async () => {
      const store = await getEventStore();

      store.contextor.register("user:created", () => [
        {
          key: "tenant:zyx",
          op: "insert",
        },
      ]);

      store.contextor.register("user:email-set", () => [
        {
          key: "tenant:zyx",
          op: "remove",
        },
      ]);

      await store.addEvent({
        stream: "user-1",
        type: "user:created",
        data: {
          name: {
            given: "John",
            family: "Doe",
          },
          email: "john.doe@fixture.none",
        },
      });

      const res1 = await store.getEventsByContext("tenant:zyx");

      assertEquals(res1.length, 1);

      await store.addEvent({
        stream: "user-1",
        type: "user:email-set",
        data: {
          email: "jane.doe@fixture.none",
        },
        meta: {
          auditor: "super",
        },
      });

      const res2 = await store.getEventsByContext("tenant:zyx");

      assertEquals(res2.length, 0);
    });
  });

  describe(".replayEvents", () => {
    it("should replay events", async () => {
      const store = await getEventStore();
      const stream = nanoid();

      const record: Record<string, any> = {};

      store.projector.on("user:created", async ({ stream, data: { name, email } }) => {
        record[stream] = {
          name,
          email,
        };
      });

      store.projector.on("user:name:given-set", async ({ stream, data: { given } }) => {
        record[stream].name.given = given;
      });

      store.projector.on("user:email-set", async ({ stream, data: { email } }) => {
        record[stream].email = email;
      });

      const events = [
        {
          stream,
          type: "user:created",
          data: {
            name: {
              given: "Jane",
              family: "Doe",
            },
            email: "jane.doe@fixture.none",
          },
        } as const,
        {
          stream,
          type: "user:name:given-set",
          data: {
            given: "John",
          },
        } as const,
        {
          stream,
          type: "user:email-set",
          data: {
            email: "john@doe.com",
          },
          meta: {
            auditor: "admin",
          },
        } as const,
      ];

      for (const event of events) {
        await store.addEvent(event);
      }

      assertObjectMatch(record, {
        [stream]: {
          name: {
            given: "John",
            family: "Doe",
          },
          email: "john@doe.com",
        },
      });

      delete record[stream];

      await store.replayEvents(stream);

      assertObjectMatch(record, {
        [stream]: {
          name: {
            given: "John",
            family: "Doe",
          },
          email: "john@doe.com",
        },
      });
    });
  });

  if (options.skipSequence === false) {
    describe(".addSequence", () => {
      it("should insert 'user:created', 'user:name:given-set', and 'user:email-set' in a sequence of events", async () => {
        const store = await getEventStore();
        const stream = nanoid();

        const events = [
          {
            stream,
            type: "user:created",
            data: {
              name: {
                given: "Jane",
                family: "Doe",
              },
              email: "jane.doe@fixture.none",
            },
          } as const,
          {
            stream,
            type: "user:name:given-set",
            data: {
              given: "John",
            },
          } as const,
          {
            stream,
            type: "user:email-set",
            data: {
              email: "john@doe.com",
            },
            meta: {
              auditor: "admin",
            },
          } as const,
        ];

        await store.addEventSequence(events);

        const records = await store.getEventsByStream(stream);

        assertEquals(records.length, 3);

        records.forEach((record, index) => {
          assertObjectMatch(record, events[index]);
        });

        const state = await store.reduce(stream, userReducer);

        assertEquals(state?.name.given, "John");
        assertEquals(state?.email, "john@doe.com");
      });

      it("should not commit any events when insert fails", async () => {
        const store = await getEventStore();
        const stream = nanoid();

        const events = [
          {
            stream,
            type: "user:created",
            data: {
              name: {
                given: "Jane",
                family: "Doe",
              },
              email: "jane.doe@fixture.none",
            },
          } as const,
          {
            stream,
            type: "user:name:given-set",
            data: {
              givens: "John",
            },
          } as any,
          {
            stream,
            type: "user:email-set",
            data: {
              email: "john@doe.com",
            },
            meta: {
              auditor: "admin",
            },
          } as const,
        ];

        await assertRejects(
          async () => store.addEventSequence(events),
          EventDataValidationFailure,
          new EventDataValidationFailure({}).message,
        );

        const records = await store.getEventsByStream(stream);

        assertEquals(records.length, 0);
      });
    });
  }

  describe(".makeReducer", () => {
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

      await store.addEvent({
        stream,
        type: "user:email-set",
        data: {
          email: "jane.doe@fixture.none",
        },
        meta: {
          auditor: "system",
        },
      });

      const state = await store.reduce(stream, userFilteredReducer);

      assertEquals(state?.name, { given: "John", family: "Doe" });
      assertEquals(state?.email, "jane.doe@fixture.none");
    });

    it("should create a 'post:count' reducer and retrieve post correct post count", async () => {
      const store = await getEventStore();
      const auditor = nanoid();

      store.contextor.register("post:created", ({ meta: { auditor } }) => [{
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

      store.contextor.register("post:created", ({ meta: { auditor } }) => [{
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

  describe(".createSnapshot", () => {
    it("should create a new snapshot", async () => {
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

      await store.addEvent({
        stream,
        type: "user:deactivated",
      });

      await store.createSnapshot(stream, userReducer);

      const snapshot = await store.snapshots.getByStream(userReducer.name, stream);

      assertNotEquals(snapshot, undefined);
      assertObjectMatch(snapshot!.state, {
        name: {
          given: "John",
          family: "Doe",
        },
        email: "jane.doe@fixture.none",
        active: false,
      });

      await store.addEvent({
        stream,
        type: "user:activated",
        meta: {
          auditor: "super",
        },
      });

      const events = await store.events.getByStream(stream, { cursor: snapshot!.cursor });

      assertEquals(events.length, 1);

      const state = await store.reduce(stream, userReducer);

      assertObjectMatch(state!, {
        name: {
          given: "John",
          family: "Doe",
        },
        email: "jane.doe@fixture.none",
        active: true,
      });
    });
  });
}
