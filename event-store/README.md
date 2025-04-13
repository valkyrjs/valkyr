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
  inputs: ["./configs/events"],
  outputs: ["./generated/events.ts"],
});
```

### Event Store

Once we have defined our configs and printed our events we create a new event store instance. Currently we have support
for `sqlite`, `postgres`, and `valkyr/db` which all works the same way. So for this example we will use the `sqlite`
store.

 - Browser _(TODO)_
 - Mongo _(TODO)_
 - [Postgres](./adapters/postgres)

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
    case "user:created": {
      state.name = `${event.data.name.given} ${event.data.name.family}`;
      state.email = event.data.email;
      break;
    }
    case "user:email-set": {
      state.email = event.data.email;
      break;
    }
  }
  return state;
}, "user", () => ({
  name: "",
  email: "",
}));
```

### Aggreates

Event aggregates takes a entity stream and reduces it to a wanted state. It works on the same conceptual grounds as
the standard reducer but resolved states using an aggregate instead of folding onto a state object.

The benefit of this is that we can create various helper methods on the aggregate that can help us navigate and
query the aggregated state.

```ts
import { AggregateRoot, makeAggregateReducer } from "@valkyr/event-store";

import type { EventRecord } from "./generated/events.ts";
import { eventStore } from "./event-store.ts";

export class User extends AggregateRoot<EventRecord> {
  name!: Name;
  email!: string;

  // -------------------------------------------------------------------------
  // Factories
  // -------------------------------------------------------------------------

  static #reducer = makeAggregateReducer(User, "user");

  static async getById(userId: string): Promise<User | undefined> {
    return eventStore.reduce({ stream: userId, reducer: this.#reducer });
  }

  // -------------------------------------------------------------------------
  // Folder
  // -------------------------------------------------------------------------

  with(event: EventRecord) {
    switch (event.type) {
      case "user:created": {
        this.name = event.data.name;
        this.email = event.data.email;
        break;
      }
      case "user:email-set": {
        this.email = event.data.email;
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  fullName() {
    return `${this.name.given} ${this.name.family}`;
  }
}

type Name = {
  given: string;
  family: string;
}
```

### Projectors

Projectors serves as a bridge between the write side and read side of your application. Think of them as event handlers
that listens for an event and creates new read side records by pushing that data to one or more data stores or apis
which is queried by your users.

A projector is registered for a specific event type, and can have multiple handlers. They also come with three different
types of listeners, `once`, `on`, and `all`.

```ts
import { projector } from "./event-store.ts";

projector.on("user:created", async (record) => {
  // do something with the event record ...
});
```

### Hydration in Event Processing

When handling events in a distributed system or during event replay operations, it is important to differentiate between **new events** and **rehydrated events**.  

- **New Events (`hydrate: false`)**: These events are being processed for the first time. They will trigger all projection handlers, including `.once()`, `.on()`, and `.all()`.  
- **Rehydrated Events (`hydrate: true`)**: These events are being replayed, either as part of a stream synchronization, system recovery, or reprocessing in a distributed environment. They **will not trigger** `.once()` handlers to avoid redundant side effects but will still be processed by `.on()` and `.all()` handlers where applicable.  

This mechanism ensures that critical one-time operations (such as sending emails or initiating external API calls) are **not repeated** unnecessarily while still allowing stateful projections to update their read models correctly.


#### `.once("user:created", (event) => Promise<void>)`

This handler tells the projection that an event is only ever processed when the event is originating directly from the
local event store. A useful pattern for when you want the event handler to submit data to a third party service such as
sending an email or submitting third party orders. We disallow `hydrate` and `outdated` as these events represents
events that has already been processed.

#### `.on("user:created", (event) => Promise<void>)`

This method tells the projection to allow events directly from the event store as well as events coming through
hydration via sync, manual or automatic stream rehydration operations. This is the default pattern used for most events.
This is where you usually project the latest data to your read side models and data stores.

We allow `hydrate` as they serve to keep the read side up to date with the latest events.

We disallow `outdated` as we do not want the latest data to be overridden by outdated ones.

NOTE! The nature of this pattern means that outdated events are never run by this projection. Make sure to handle
`outdated` events if you have processing requirements that needs to know about every unknown events that has occurred in
the event stream.

#### `.all("user:created", (event) => Promise<void>)`

This method is a catch all for events that does not fall under the stricter definitions of once and on patterns. This is
a good place to deal with data that does not depend on a strict order of events.
