import { resolve } from "node:path";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: [
    resolve(__dirname, "..", "contexts.ts"),
    resolve(__dirname, "..", "events.ts"),
    resolve(__dirname, "..", "snapshots.ts"),
    resolve(__dirname, "..", "schema.ts"),
  ],
  out: resolve(__dirname, "out"),
});
