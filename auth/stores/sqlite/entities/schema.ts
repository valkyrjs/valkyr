import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const schema = sqliteTable("valkyr_role_entities", {
  roleId: text("role_id").notNull(),
  entityId: text("entity_id").notNull(),
  conditions: text("conditions"),
  filters: text("filters"),
}, (table) => ({
  roleIdIdx: index("valkry_role_entities_role_id_idx").on(table.roleId),
  entityIdIx: index("valkry_role_entities_entity_id_idx").on(table.entityId),
}));

export type Entity = typeof schema.$inferSelect;
