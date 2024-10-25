import { index, jsonb, type PgColumn, type PgTableWithColumns, serial, varchar } from "drizzle-orm/pg-core";

import { schema } from "../schema.ts";

export const entities: Table = schema.table("entities", {
  id: serial("id").primaryKey(),
  entityId: varchar("entity_id").notNull(),
  roleId: varchar("role_id").notNull(),
  conditions: jsonb("conditions").$type<Record<string, unknown>>(),
  filters: jsonb("filters").$type<Record<string, unknown>>(),
}, (table) => ({
  roleIdIdx: index().on(table.roleId),
  entityIdIdx: index().on(table.entityId),
}));

export type Entity = typeof entities.$inferSelect;

type Table = PgTableWithColumns<{
  name: "entities";
  schema: "auth";
  columns: {
    id: PgColumn<
      {
        name: "id";
        tableName: "entities";
        dataType: "number";
        columnType: "PgSerial";
        data: number;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        generated: undefined;
      }
    >;
    entityId: PgColumn<
      {
        name: "entity_id";
        tableName: "entities";
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
      }
    >;
    roleId: PgColumn<{
      name: "role_id";
      tableName: "entities";
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
    conditions: PgColumn<{
      name: "conditions";
      tableName: "entities";
      dataType: "json";
      columnType: "PgJsonb";
      data: Record<string, unknown>;
      driverParam: unknown;
      notNull: false;
      hasDefault: false;
      isPrimaryKey: false;
      isAutoincrement: false;
      hasRuntimeDefault: false;
      enumValues: undefined;
      baseColumn: never;
      generated: undefined;
    }>;
    filters: PgColumn<{
      name: "filters";
      tableName: "entities";
      dataType: "json";
      columnType: "PgJsonb";
      data: Record<string, unknown>;
      driverParam: unknown;
      notNull: false;
      hasDefault: false;
      isPrimaryKey: false;
      isAutoincrement: false;
      hasRuntimeDefault: false;
      enumValues: undefined;
      baseColumn: never;
      generated: undefined;
    }>;
  };
  dialect: "pg";
}>;
