import { index, type PgColumn, type PgTableWithColumns, varchar } from "drizzle-orm/pg-core";

import { schema } from "../schema.ts";

export const roles: Table = schema.table("roles", {
  id: varchar("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull(),
  name: varchar("name").notNull(),
  permissions: varchar("permissions").notNull(),
}, (table) => ({
  tenantIdIdx: index().on(table.tenantId),
}));

export type Role = typeof roles.$inferSelect;

type Table = PgTableWithColumns<{
  name: "roles";
  schema: "auth";
  columns: {
    id: PgColumn<
      {
        name: "id";
        tableName: "roles";
        dataType: "string";
        columnType: "PgVarchar";
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
      }
    >;
    tenantId: PgColumn<{
      name: "tenant_id";
      tableName: "roles";
      dataType: "string";
      columnType: "PgVarchar";
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
    name: PgColumn<{
      name: "name";
      tableName: "roles";
      dataType: "string";
      columnType: "PgVarchar";
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
    permissions: PgColumn<{
      name: "permissions";
      tableName: "roles";
      dataType: "string";
      columnType: "PgVarchar";
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
  dialect: "pg";
}>;
