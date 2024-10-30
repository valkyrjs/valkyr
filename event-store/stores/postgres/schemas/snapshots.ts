import { index, jsonb, type PgColumn, type PgTableWithColumns, serial, varchar } from "drizzle-orm/pg-core";

import { schema } from "../schema.ts";

export const snapshots: PGSnapshotTable = schema.table("snapshots", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  stream: varchar("stream").notNull(),
  cursor: varchar("cursor").notNull(),
  state: jsonb("state").$type<Record<string, any>>().notNull(),
}, (table) => [
  index().on(table.name, table.stream, table.cursor),
]);

export type Snapshot = typeof snapshots.$inferSelect;

export type PGSnapshotTable = PgTableWithColumns<{
  name: "snapshots";
  schema: "event_store";
  columns: {
    id: PgColumn<
      {
        name: "id";
        tableName: "snapshots";
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
    name: PgColumn<
      {
        name: "name";
        tableName: "snapshots";
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
    stream: PgColumn<
      {
        name: "stream";
        tableName: "snapshots";
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
    cursor: PgColumn<
      {
        name: "cursor";
        tableName: "snapshots";
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
    state: PgColumn<
      {
        name: "state";
        tableName: "snapshots";
        dataType: "json";
        columnType: "PgJsonb";
        data: Record<string, any>;
        driverParam: unknown;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        generated: undefined;
      }
    >;
  };
  dialect: "pg";
}>;
