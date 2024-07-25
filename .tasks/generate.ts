import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// ### Run Setup

await Deno.run({
  cmd: ["deno", "cache", "-r", "--allow-scripts", "--node-modules-dir", "npm:drizzle-orm", "npm:drizzle-kit"],
}).status();

// ### Patch Drizzle Kit
// We need to patch a bug in the drizzle-kit/bin.cjs as it prefixes a ./ onto the
// paths defined in the drizzle config.
// https://github.com/drizzle-team/drizzle-kit-mirror/issues/331

const path = resolve("node_modules", "drizzle-kit", "bin.cjs");

const line = "const raw2 = JSON.parse((0, import_fs.readFileSync)(`./${it}`).toString());";
const patch = "const raw2 = JSON.parse((0, import_fs.readFileSync)(it).toString());";

const file = await readFile(path, { encoding: "utf-8" });

if (file.includes(line) === true) {
  await writeFile(path, file.replace(line, patch));
}

// ### Generate Migrations

await Deno.run({ cmd: ["npx", "drizzle-kit", "generate", "--config", "auth/stores/sqlite/migrations/config.ts"] }).status();
await Deno.run({ cmd: ["npx", "drizzle-kit", "generate", "--config", "event-store/stores/pg/migrations/config.ts"] }).status();
await Deno.run({ cmd: ["npx", "drizzle-kit", "generate", "--config", "event-store/stores/sqlite/migrations/config.ts"] }).status();
