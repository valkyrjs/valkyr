import { assertEquals, assertRejects } from "@std/assert";
import { it } from "@std/testing/bdd";

import { BadRequestError } from "../mod.ts";
import { api } from "./mocks/client.ts";

it("should handle rpc requests", async () => {
  const name = await api.blog.users.create({ name: "John Doe" });
  assertEquals(name, "John Doe");

  const post = await api.blog.posts.create({ title: "Foo", body: "Bar", author: name });
  assertEquals(post, "Foo | Bar | John Doe");
});

it("should handle error events", async () => {
  await assertRejects(async () => api.blog.users.create({ name: "test" }), BadRequestError, "Invalid name given");
});
