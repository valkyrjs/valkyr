import { makeReducer } from "~libraries/reducer.ts";

import type { EventRecord } from "./events.ts";

export const userPostReducer = makeReducer<EventRecord, UserPostState>((state, event) => {
  switch (event.type) {
    case "post:created": {
      state.posts.push({ id: event.stream, author: event.meta.auditor });
      state.count += 1;
      break;
    }
    case "post:removed": {
      state.posts = state.posts.filter(({ id }) => id !== event.stream);
      state.count -= 1;
      break;
    }
  }
  return state;
}, {
  name: "user:posts",
  type: "relation",
}, () => ({
  posts: [],
  count: 0,
}));

type UserPostState = {
  posts: {
    id: string;
    author: string;
  }[];
  count: number;
};
