import { assertEquals, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

import { JsonRpcClient } from "./mocks/json-rpc-client.ts";

const client = new JsonRpcClient();

describe("requests", () => {
  it("should handle rpc call with position parameters", async () => {
    assertEquals(await client.subtractPositional(42, 23), 19);
    assertEquals(await client.subtractNamed(23, 42), -19);
  });

  it("should handle a notification", async () => {
    assertEquals(await client.update([1, 2, 3, 4, 5]), undefined);
  });

  it("should handle call of non-existent method", async () => {
    assertRejects(async () => client.foobar(), Error, "Method not found");
  });
});
