import { index, jsonb, type PgColumn, type PgTableWithColumns, serial, varchar } from "drizzle-orm/pg-core";

import { schema } from "../schema.ts";

export const snapshots: Table = schema.table("snapshots", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  stream: varchar("stream").notNull(),
  cursor: varchar("cursor").notNull(),
  state: jsonb("state").$type<Record<string, any>>().notNull(),
}, (table) => ({
  nameStreamIdx: index().on(table.name, table.stream, table.cursor),
}));

export type Snapshot = typeof snapshots.$inferSelect;

type Table = PgTableWithColumns<{
  name: "snapshots";
  schema: "event_store";
  columns: {
    name: PgColumn<{
      name: "name";
      tableName: "snapshots";
      dataType: "string";
      columnType: "PgVarchar";
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
    }>;
    stream: PgColumn<{
      name: "stream";
      tableName: "snapshots";
      dataType: "string";
      columnType: "PgVarchar";
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
    }>;
    cursor: PgColumn<{
      name: "cursor";
      tableName: "snapshots";
      dataType: "string";
      columnType: "PgVarchar";
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
    }>;
    state: PgColumn<{
      name: "state";
      tableName: "snapshots";
      dataType: "json";
      columnType: "PgJsonb";
      data: Record<string, any>;
      driverParam: unknown;
      notNull: true;
      hasDefault: false;
      enumValues: undefined;
      baseColumn: never;
    }>;
  };
  dialect: "pg";
}>;
