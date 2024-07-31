import { assertEquals, assertRejects } from "@std/assert";

import { command } from "../sub-process/mod.ts";

Deno.test("Sub Process > Handle 'Hello World' evaluation", async () => {
  const output = await command(Deno.execPath(), "eval", "console.log('Hello World')");
  assertEquals(output, "Hello World");
});

Deno.test("Sub Process > Handle error event", async () => {
  await assertRejects(async () => command(Deno.execPath(), "eval", "throw new Error('Example Error')"), Error, "Example Error");
});
