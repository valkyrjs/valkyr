import { assertEquals, assertObjectMatch, assertRejects } from "@std/assert";
import { it } from "@std/testing/bdd";

import { EventDataValidationFailure, EventInsertionFailure, EventValidationFailure } from "~libraries/errors.ts";

import { CustomServiceError } from "../mocks/errors.ts";
import type { Event, EventRecord } from "../mocks/events.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".addEvent", (getEventStore) => {
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
