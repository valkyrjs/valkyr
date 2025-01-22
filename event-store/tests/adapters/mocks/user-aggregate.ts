import { AggregateRoot } from "~libraries/aggregate.ts";
import { EventStore } from "~libraries/event-store.ts";
import { makeAggregateReducer } from "~libraries/reducer.ts";
import { EventToRecord } from "~types/event.ts";

import type { Event } from "./events.ts";

export class User extends AggregateRoot<Event> {
  id: string = "";
  name: Name = {
    given: "",
    family: "",
  };
  email: string = "";
  active: boolean = true;
  posts: UserPosts = {
    list: [],
    count: 0,
  };

  // -------------------------------------------------------------------------
  // Factories
  // -------------------------------------------------------------------------

  static reducer = makeAggregateReducer(User);

  static create(name: Name, email: string): User {
    const user = new User();
    user.push({
      type: "user:created",
      data: { name, email },
    });
    return user;
  }

  static async getById(userId: string, store: EventStore<Event>): Promise<User | undefined> {
    return store.reduce({ name: "user", stream: userId, reducer: this.reducer });
  }

  // -------------------------------------------------------------------------
  // Reducer
  // -------------------------------------------------------------------------

  with(event: EventToRecord<Event>) {
    switch (event.type) {
      case "user:created": {
        this.id = event.stream;
        this.name.given = event.data.name.given ?? "";
        this.name.family = event.data.name.family ?? "";
        this.email = event.data.email;
        break;
      }
      case "user:name:given-set": {
        this.name.given = event.data.given;
        break;
      }
      case "user:name:family-set": {
        this.name.family = event.data.family;
        break;
      }
      case "user:email-set": {
        this.email = event.data.email;
        break;
      }
      case "user:activated": {
        this.active = true;
        break;
      }
      case "user:deactivated": {
        this.active = false;
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  setGivenName(given: string): this {
    return this.push({
      type: "user:name:given-set",
      stream: this.id,
      data: { given },
    });
  }

  setFamilyName(family: string): this {
    return this.push({
      type: "user:name:family-set",
      stream: this.id,
      data: { family },
    });
  }

  setEmail(email: string, auditor: string): this {
    return this.push({
      type: "user:email-set",
      stream: this.id,
      data: { email },
      meta: { auditor },
    });
  }

  async snapshot(store: EventStore<Event>): Promise<this> {
    await store.createSnapshot({ name: "user", stream: this.id, reducer: User.reducer });
    return this;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  fullName(): string {
    return `${this.name.given} ${this.name.family}`;
  }
}

type Name = {
  given: string;
  family: string;
};

type UserPosts = {
  list: string[];
  count: number;
};
