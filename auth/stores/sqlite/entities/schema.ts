import { index, type SQLiteColumn, sqliteTable, type SQLiteTableWithColumns, text } from "drizzle-orm/sqlite-core";

export const schema: Table = sqliteTable("valkyr_role_entities", {
  roleId: text("role_id").notNull(),
  entityId: text("entity_id").notNull(),
  conditions: text("conditions"),
  filters: text("filters"),
}, (table) => ({
  roleIdIdx: index("valkry_role_entities_role_id_idx").on(table.roleId),
  entityIdIx: index("valkry_role_entities_entity_id_idx").on(table.entityId),
}));

export type Entity = typeof schema.$inferSelect;

type Table = SQLiteTableWithColumns<{
  name: "valkyr_role_entities";
  schema: undefined;
  columns: {
    roleId: SQLiteColumn<{
      name: "role_id";
      tableName: "valkyr_role_entities";
      dataType: "string";
      columnType: "SQLiteText";
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      isPrimaryKey: false;
      isAutoincrement: false;
      hasRuntimeDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
      generated: undefined;
    }>;
    entityId: SQLiteColumn<{
      name: "entity_id";
      tableName: "valkyr_role_entities";
      dataType: "string";
      columnType: "SQLiteText";
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      isPrimaryKey: false;
      isAutoincrement: false;
      hasRuntimeDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
      generated: undefined;
    }>;
    conditions: SQLiteColumn<{
      name: "conditions";
      tableName: "valkyr_role_entities";
      dataType: "string";
      columnType: "SQLiteText";
      data: string;
      driverParam: string;
      notNull: false;
      hasDefault: false;
      isPrimaryKey: false;
      isAutoincrement: false;
      hasRuntimeDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
      generated: undefined;
    }>;
    filters: SQLiteColumn<{
      name: "filters";
      tableName: "valkyr_role_entities";
      dataType: "string";
      columnType: "SQLiteText";
      data: string;
      driverParam: string;
      notNull: false;
      hasDefault: false;
      isPrimaryKey: false;
      isAutoincrement: false;
      hasRuntimeDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
      generated: undefined;
    }>;
  };
  dialect: "sqlite";
}>;
