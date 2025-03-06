import { assertEquals, assertObjectMatch } from "@std/assert";
import { it } from "@std/testing/bdd";

import { makeId } from "~libraries/nanoid.ts";

import type { Event, EventRecord } from "../mocks/events.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>("projector.once", (getEventStore) => {
  it("should handle successfull projection", async () => {
    const { store, projector } = await getEventStore();

    const stream = makeId();
    const event = {
      stream,
      type: "user:created",
      data: {
        name: {
          given: "John",
          family: "Doe",
        },
        email: "john.doe@fixture.none",
      },
    } as const;

    let emailId: string | Error | undefined;

    projector.once("user:created", async () => {
      return { id: "fake-email-id" };
    }, {
      async onError({ error }) {
        emailId = error as Error;
      },
      async onSuccess({ data }) {
        emailId = data.id;
      },
    });

    await store.addEvent(event);

    assertObjectMatch(await store.events.getByStream(stream).then((rows) => rows[0]), event);
    assertEquals(emailId, "fake-email-id");
  });

  it("should handle failed projection", async () => {
    const { store, projector } = await getEventStore();

    const stream = makeId();
    const event = {
      stream,
      type: "user:created",
      data: {
        name: {
          given: "John",
          family: "Doe",
        },
        email: "john.doe@fixture.none",
      },
    } as const;

    let emailId: string | Error | undefined;

    projector.once("user:created", async () => {
      fakeEmail();
    }, {
      async onError({ error }) {
        emailId = error as Error;
      },
      async onSuccess() {},
    });

    await store.addEvent(event);

    assertObjectMatch(await store.events.getByStream(stream).then((rows) => rows[0]), event);
    assertEquals(emailId, new Error("Failed to send email!"));
  });
});

function fakeEmail() {
  throw new Error("Failed to send email!");
}
