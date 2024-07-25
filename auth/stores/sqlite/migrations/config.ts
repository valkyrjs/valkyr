import { resolve } from "node:path";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: [
    resolve(__dirname, "..", "entities", "schema.ts"),
    resolve(__dirname, "..", "roles", "schema.ts"),
  ],
  out: resolve(__dirname, "out"),
});
