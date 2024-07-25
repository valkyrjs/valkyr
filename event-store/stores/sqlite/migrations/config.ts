import { resolve } from "node:path";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: [
    resolve(__dirname, "..", "contexts", "schema.ts"),
    resolve(__dirname, "..", "events", "schema.ts"),
    resolve(__dirname, "..", "snapshots", "schema.ts"),
  ],
  out: resolve(__dirname, "out"),
});
