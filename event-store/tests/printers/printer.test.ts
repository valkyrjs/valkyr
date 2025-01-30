import { join } from "node:path";

import { assertArrayIncludes, assertRejects } from "@std/assert";
import { afterAll, describe, it } from "@std/testing/bdd";

import { printEvents } from "../../printers/printer.ts";

describe("Events Printer", () => {
  const temp = join(import.meta.dirname!, "_temp");
  const output = join(temp, "events.ts");

  afterAll(async () => {
    // await Deno.remove(temp, { recursive: true });
  });

  it("should create a new events.ts file", async () => {
    await printEvents({
      inputs: [join(import.meta.dirname!, "mocks", "events")],
      outputs: [output],
    });

    const { events, validators } = await import(output);

    assertArrayIncludes(Array.from(events), [
      "user:activated",
      "user:created",
      "user:deactivated",
      "user:email-set",
      "user:name:family-set",
      "user:name:given-set",
      "user:meta-added",
    ]);

    assertArrayIncludes(Array.from(validators.data.keys()), [
      "user:created",
      "user:email-set",
      "user:name:family-set",
      "user:name:given-set",
    ]);

    assertArrayIncludes(Array.from(validators.meta.keys()), [
      "user:activated",
      "user:email-set",
    ]);

    await assertRejects(
      async () => validators.data.get("post:comment:added").parseAsync({ type: "invalid", body: "Hello World" }),
    );
  });
});
