import { resolve } from "node:path";

//  && deno test -A --unstable-ffi

// ### Test Setup

await Deno.run({ cmd: ["deno", "run", "-A", "scripts/generate.ts"], cwd: resolve("api") }).status();
