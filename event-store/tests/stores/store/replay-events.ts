import { assertObjectMatch } from "@std/assert";
import { it } from "@std/testing/bdd";
import { nanoid } from "nanoid";

import type { Event, EventRecord } from "../mocks/events.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".replayEvents", (getEventStore) => {
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
