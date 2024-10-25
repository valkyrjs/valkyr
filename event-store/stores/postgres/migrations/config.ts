import { resolve } from "node:path";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: [
    resolve(__dirname, "..", "schemas", "contexts.ts"),
    resolve(__dirname, "..", "schemas", "events.ts"),
    resolve(__dirname, "..", "schemas", "snapshots.ts"),
    resolve(__dirname, "..", "schema.ts"),
  ],
  out: resolve(__dirname, "out"),
});
