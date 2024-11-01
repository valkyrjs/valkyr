<p align="center">
  <img src="https://user-images.githubusercontent.com/1998130/229430454-ca0f2811-d874-4314-b13d-c558de8eec7e.svg" />
</p>

# Event Store

Event store solution written in deno for use in TypeScript projects to manage and distribute events from a central
repository to one or more distibuted services.

## Quick Start

The following provides a quick introduction on how to get started.

### Configs

Events are defined in `json` configuration files which we print to a generated `events.ts` file that is used by the
event store instance we are using. To do this, start by creating a new folder that will house our event configurations.

```sh
$ mkdir events
$ cd events
```

Now add a new event configuration file.

```sh
$ touch user-created.json
```

Open the file and add the event details.

```json
{
  "event": {
    "type": "user:created",
    "data": {
      "name": {
        "type": "object",
        "properties": {
          "given": {
            "type": "string"
          },
          "family": {
            "type": "string"
          }
        }
      },
      "email": {
        "type": "string"
      }
    },
    "meta": {
      "auditor": {
        "type": "string"
      }
    }
  }
}
```

### Generate

To create our `events.ts` file we have to run our configurations through our event printer.

```ts
import { printEvents } from "@valkyr/event-store";

await printEvents({
  paths: [
    "./configs/events",
  ],
  output: "./generated/events.ts",
});
```

### Event Store

Once we have defined our configs and printed our events we create a new event store instance. Currently we have support
for `sqlite`, `postgres`, and `valkyr/db` which all works the same way. So for this example we will use the `sqlite`
store.

```ts
import { PostgresEventStore } from "@valkyr/event-store/postgres";
import psql from "postgres";

import { type Event, type EventRecord, events, validators } from "./generated/events.ts";

export const eventStore = new PostgresEventStore<Event>({
  database: () => {
    return psql("url");
  },
  events,
  validators,
  hooks: {
    async onError(error) {
      // when the event store throws unhandled errors they will end up in
      // this location that can be further logged in the systems own logger
      // if onError hook is not provided all unhandled errors are logged
      // through the `console.error` method.
    },
  },
});

const projector = new Projector<EventRecord>();

eventStore.onEventsInserted(async (records, { batch }) => {
  // trigger event side effects here such as sending the records through
  // an event messaging system or other projection patterns

  // ### Projector
  // The following is an example when registering event handlers with the
  // projectors instance provided by this library.

  if (batch !== undefined) {
    await projector.pushMany(batch, records);
  } else {
    for (const record of records) {
      await projector.push(record, { hydrated: false, outdated: false });
    }
  }
});
```

### Reducers

Event reducers takes a entity stream and reduces it to a wanted state. This is required when we want to perform write
side business logic on the current state of our streams. Using read stores for this is not ideal as the read side data
may not be up to date.

```ts
import { makeReducer } from "@valkyr/event-store";

import type { EventRecord } from "./generated/events.ts";

const reducer = makeReducer<{
  name: string;
  email: string;
}, EventRecord>((state, event) => {
  switch (event.type) {
    case "UserCreated": {
      state.name = `${event.data.name.given} ${event.data.name.family}`;
      state.email = event.data.email;
      break;
    }
    case "UserEmailSet": {
      state.email = event.data.email;
      break;
    }
  }
  return state;
}, {
  name: "user",
  type: "stream",
  state: () => ({
    name: "",
    email: "",
  }),
});
```

### Aggreates

Event aggregates takes a entity stream and reduces it to a wanted state. It works on the same conceptual grounds as
the standard reducer but resolved states using an aggregate instead of folding onto a state object.

The benefit of this is that we can create various helper methods on the aggregate that can help us navigate and
query the aggregated state.

```ts
import { AggregateRoot, makeAggregateReducer } from "@valkyr/event-store";

import type { EventRecord } from "./generated/events.ts";

export class User extends AggregateRoot<EventRecord> {
  name: {
    given: string;
    family: string;
  } = {
    given: ""
    family: ""
  }
  email = "";

  with(event: EventRecord) {
    switch (event.type) {
      case "UserCreated": {
        this.name.given = event.data.name.given;
        this.name.family = event.data.name.family;
        this.email = event.data.email;
        break;
      }
      case "UserEmailSet": {
        this.email = event.data.email;
        break;
      }
    }
  }

  fullName() {
    return `${this.name.given} ${this.name.family}`;
  }
}

export const reducer = makeAggregateReducer(User, {
  name: "user",
  type: "stream",
});
```

### Projectors

Projectors serves as a bridge between the write side and read side of your application. Think of them as event handlers
that listens for an event and creates new read side records by pushing that data to one or more data stores or apis
which is queried by your users.

A projector is registered for a specific event type, and can have multiple handlers. They also come with three different
types of listeners, `once`, `on`, and `all`.

```ts
import { projector } from "./event-store.ts";

projector.on("UserCreated", async (record) => {
  await db.insert({
    name: `{record.data.name.given} ${record.data.name.family}`,
    email: record.data.email,
    createdBy: record.meta.auditor,
    createdAt: record.created,
  });
});
```

#### `.once("UserCreated", (event) => Promise<void>)`

This handler tells the projection that an event is only ever processed when the event is originating directly from the
local event store. A useful pattern for when you want the event handler to submit data to a third party service such as
sending an email or submitting third party orders. We disallow `hydrate` and `outdated` as these events represents
events that has already been processed.

#### `.on("UserCreated", (event) => Promise<void>)`

This method tells the projection to allow events directly from the event store as well as events coming through
hydration via sync, manual or automatic stream rehydration operations. This is the default pattern used for most events.
This is where you usually project the latest data to your read side models and data stores.

We allow `hydrate` as they serve to keep the read side up to date with the latest events.

We disallow `outdated` as we do not want the latest data to be overridden by outdated ones.

NOTE! The nature of this pattern means that outdated events are never run by this projection. Make sure to handle
`outdated` events if you have processing requirements that needs to know about every unknown events that has occurred in
the event stream.

#### `.all("UserCreated", (event) => Promise<void>)`

This method is a catch all for events that does not fall under the stricter definitions of once and on patterns. This is
a good place to deal with data that does not depend on a strict order of events.
