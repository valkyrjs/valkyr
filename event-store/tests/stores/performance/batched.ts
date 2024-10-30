import { PostgresTestContainer } from "@valkyr/testcontainers/postgres";

import { migrate } from "~stores/postgres/database.ts";
import { PostgresEventStore } from "~stores/postgres/event-store.ts";

import { type Event, events, validators } from "../mocks/events.ts";

const ITTERATIONS = 10_000;

const DB_NAME = "sandbox";

const container = await PostgresTestContainer.start("postgres:14");
const sql = container.client(DB_NAME);

await container.create(DB_NAME);
await migrate(sql);

await sql`
  CREATE TABLE IF NOT EXISTS "event_store"."users" (
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "email" varchar NOT NULL
  );
`;

const eventStore = new PostgresEventStore<Event>({ database: sql, events, validators });

eventStore.projector.on("user:created", async ({ stream, data: { name: { given, family }, email } }) => {
  try {
    await sql`INSERT INTO "event_store"."users" ${sql({ id: stream, name: `${given} ${family}`, email }, "id", "name", "email")}`;
  } catch (error) {
    console.log(error);
  }
});

const insert: any[] = [];

let count = ITTERATIONS;
while (count--) {
  insert.push({
    type: "user:created",
    data: {
      name: {
        given: "John",
        family: "Doe",
      },
      email: "john.doe@fixture.none",
    },
  });
}

const t0 = performance.now();

await eventStore.addManyEvents(insert);

console.log(`.addManyEvents | Added & Projected: ${ITTERATIONS.toLocaleString()} events in ${((performance.now() - t0) / 1000).toLocaleString()}s`);

await container.stop();
