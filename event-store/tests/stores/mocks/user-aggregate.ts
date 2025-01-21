import { AggregateRoot } from "~libraries/aggregate.ts";
import { makeAggregateReducer } from "~libraries/reducer.ts";
import { EventStore } from "~types/event-store.ts";

import type { Event, EventRecord } from "./events.ts";

export class User extends AggregateRoot<EventRecord> {
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

  #store?: EventStore<Event, EventRecord>;

  // -------------------------------------------------------------------------
  // Factories
  // -------------------------------------------------------------------------

  static reducer = makeAggregateReducer(User);

  static create(name: Name, email: string, store: EventStore<Event, EventRecord>): User {
    const user = new User();
    user.store = store;
    user.push(store.makeEvent({
      type: "user:created",
      data: { name, email },
    }));
    return user;
  }

  static async getById(userId: string, store: EventStore<Event, EventRecord>): Promise<User | undefined> {
    return store.reduce({ name: "user", stream: userId, reducer: this.reducer });
  }

  // -------------------------------------------------------------------------
  // Getters & Setters
  // -------------------------------------------------------------------------

  set store(store: EventStore<Event, EventRecord>) {
    this.#store = store;
  }

  get store(): EventStore<Event, EventRecord> {
    if (this.#store === undefined) {
      throw new Error("User > Cannot fetch unassigned .store");
    }
    return this.#store;
  }

  // -------------------------------------------------------------------------
  // Reducer
  // -------------------------------------------------------------------------

  with(event: EventRecord) {
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
    this.push(this.store.makeEvent({
      type: "user:name:given-set",
      stream: this.id,
      data: { given },
    }));
    return this;
  }

  setFamilyName(family: string): this {
    this.push(this.store.makeEvent({
      type: "user:name:family-set",
      stream: this.id,
      data: { family },
    }));
    return this;
  }

  setEmail(email: string, auditor: string): this {
    this.push(this.store.makeEvent({
      type: "user:email-set",
      stream: this.id,
      data: { email },
      meta: { auditor },
    }));
    return this;
  }

  async snapshot(): Promise<this> {
    await this.store.createSnapshot({ name: "user", stream: this.id, reducer: User.reducer });
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
