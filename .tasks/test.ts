import { resolve } from "node:path";

import { execute } from "@valkyr/process";

await execute("deno", "run", "-A", `${resolve("api")}/scripts/generate.ts`);
