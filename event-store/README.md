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
    "type": "UserCreated",
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
import { Database } from "sqlite";

import { SQLiteEventStore } from "@valkyr/event-store/sqlite";
import { z } from "@valkyr/event-store";

const eventStore = new SQLiteEventStore<UserEvent>({
  database: new Database(":memory:"),
  events: new Set(
    [
      "UserCreated",
      "UserGivenNameSet",
      "UserFamilyNameSet",
      "UserEmailSet",
    ] as const,
  ),
  validators: new Map<UserEvent["type"], any>([
    [
      "UserCreated",
      z.object({ name: z.object({ given: z.string(), family: z.string() }).strict(), email: z.string() }).strict(),
    ],
    ["UserEmailSet", z.object({ email: z.string() }).strict()],
    ["UserFamilyNameSet", z.object({ family: z.string() }).strict()],
    ["UserGivenNameSet", z.object({ given: z.string() }).strict()],
  ]),
});

type UserEvent = UserCreated | UserGivenNameSet | UserFamilyNameSet | UserEmailSet;

type UserCreated = Event<
  "UserCreated",
  {
    name: {
      given: string;
      family: string;
    };
    email: string;
  },
  { auditor: string }
>;
type UserGivenNameSet = Event<"UserGivenNameSet", { given: string }, { auditor: string }>;
type UserFamilyNameSet = Event<"UserFamilyNameSet", { family: string }, { auditor: string }>;
type UserEmailSet = Event<"UserEmailSet", { email: string }, { auditor: string }>;
```

### Reducers

Event reducers takes a entity stream and reduces it to a wanted state. This is required when we want to perform write
side business logic on the current state of our streams. Using read stores for this is not ideal as the read side data
may not be up to date.

```ts
import { eventStore } from "./event-store.ts";

const userReducer = eventStore.reducer<{
  name: string;
  email: string;
}>((state, event) => {
  switch (event.type) {
    case "UserCreated": {
      return {
        ...state,
        name: `${event.data.name.given} ${event.data.name.family}`,
        email: event.data.email,
      };
    }
    case "UserEmailSet": {
      return {
        ...state,
        email: event.data.email,
      };
    }
  }
  return state;
}, {
  name: "",
  email: "",
});
```

### Validators

To validate incoming events before they are inserted into the event store we can register some business logic
validators. A validator is registered for a specific event type, and can have multiple handlers.

```ts
import { eventStore } from "./event-store.ts";

eventStore.validator.on("UserEmailSet", async (record) => {
  const user = await store.getStreamState(stream, userReducer);
  if (user === undefined) {
    throw new Error("Event stream does not exist");
  }
  if (user.email === record.data.email) {
    throw new Error("Email has not changed");
  }
});
```

### Projectors

Projectors serves as a bridge between the write side and read side of your application. Think of them as event handlers
that listens for an event and creates new read side records by pushing that data to one or more data stores or apis
which is queried by your users.

A projector is registered for a specific event type, and can have multiple handlers. They also come with three different
types of listeners, `once`, `on`, and `all`.

```ts
import { eventStore } from "./event-store.ts";

eventStore.projector.on("UserCreated", async (record) => {
  await db.insert({
    name: `{record.data.name.given} ${record.data.name.family}`,
    email: record.data.email,
    createdBy: record.meta.auditor,
    createdAt: record.created,
  });
});
```

#### Once

This handler tells the projection that an event is only ever processed when the event is originating directly from the
local event store. A useful pattern for when you want the event handler to submit data to a third party service such as
sending an email or submitting third party orders. We disallow `hydrate` and `outdated` as these events represents
events that has already been processed.

#### On

This method tells the projection to allow events directly from the event store as well as events coming through
hydration via sync, manual or automatic stream rehydration operations. This is the default pattern used for most events.
This is where you usually project the latest data to your read side models and data stores.

We allow `hydrate` as they serve to keep the read side up to date with the latest events.

We disallow `outdated` as we do not want the latest data to be overridden by outdated ones.

NOTE! The nature of this pattern means that outdated events are never run by this projection. Make sure to handle
`outdated` events if you have processing requirements that needs to know about every unknown events that has occurred in
the event stream.

#### All

This method is a catch all for events that does not fall under the stricter definitions of once and on patterns. This is
a good place to deal with data that does not depend on a strict order of events.
