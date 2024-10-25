import { resolve } from "node:path";

import { Api } from "~libraries/api.ts";
import { resolveMethods } from "~utilities/methods.ts";

const EXAMPLES_PATH = resolve(import.meta.dirname!, "modules");

export const server = new Api();

for (const method of await resolveMethods(EXAMPLES_PATH)) {
  server.register(method);
}
