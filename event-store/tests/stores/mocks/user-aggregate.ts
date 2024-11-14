import { AggregateRoot } from "~libraries/aggregate.ts";
import { makeAggregateReducer } from "~libraries/reducer.ts";

import type { EventRecord } from "./events.ts";

export class User extends AggregateRoot<EventRecord> {
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

  with(event: EventRecord) {
    switch (event.type) {
      case "user:created": {
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

  fullName(): string {
    return `${this.name.given} ${this.name.family}`;
  }
}

export const userAggregateReducer = makeAggregateReducer(User, "user:aggregate");

type Name = {
  given: string;
  family: string;
};

type UserPosts = {
  list: string[];
  count: number;
};
