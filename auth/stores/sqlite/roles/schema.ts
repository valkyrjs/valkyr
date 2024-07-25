import { index, type SQLiteColumn, sqliteTable, type SQLiteTableWithColumns, text } from "drizzle-orm/sqlite-core";

export const schema: Table = sqliteTable("valkyr_roles", {
  roleId: text("role_id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  permissions: text("permissions").notNull(),
}, (table) => ({
  tenantIdIdx: index("valkyr_roles_tenant_id_idx").on(table.tenantId),
}));

export type Role = typeof schema.$inferSelect;

type Table = SQLiteTableWithColumns<{
  name: "valkyr_roles";
  schema: undefined;
  columns: {
    roleId: SQLiteColumn<{
      name: "role_id";
      tableName: "valkyr_roles";
      dataType: "string";
      columnType: "SQLiteText";
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      isPrimaryKey: true;
      isAutoincrement: false;
      hasRuntimeDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
      generated: undefined;
    }>;
    tenantId: SQLiteColumn<{
      name: "tenant_id";
      tableName: "valkyr_roles";
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
    name: SQLiteColumn<{
      name: "name";
      tableName: "valkyr_roles";
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
    permissions: SQLiteColumn<{
      name: "permissions";
      tableName: "valkyr_roles";
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
  };
  dialect: "sqlite";
}>;
