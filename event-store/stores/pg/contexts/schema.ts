import { index, type PgColumn, type PgTableWithColumns, serial, varchar } from "drizzle-orm/pg-core";

import { schema } from "../schema.ts";

export const contexts = schema.table("contexts", {
  id: serial("id").primaryKey(),
  key: varchar("key").notNull(),
  stream: varchar("stream").notNull(),
}, (table) => ({
  keyIdx: index().on(table.key),
}));
