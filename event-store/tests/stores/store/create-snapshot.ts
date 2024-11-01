import { assertEquals, assertNotEquals, assertObjectMatch } from "@std/assert";
import { it } from "@std/testing/bdd";
import { nanoid } from "nanoid";

import type { Event, EventRecord } from "../mocks/events.ts";
import { userReducer } from "../mocks/user-reducer.ts";
import { describe } from "../utilities/describe.ts";

export default describe<Event, EventRecord>(".createSnapshot", (getEventStore) => {
  it("should create a new snapshot", async () => {
    const { store } = await getEventStore();
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
