import { index, jsonb, type PgColumn, type PgTableWithColumns, varchar } from "drizzle-orm/pg-core";

import type { EventRecord } from "~types/event.ts";

import { schema } from "../schema.ts";

export const events: PGEventTable = schema.table("events", {
  id: varchar("id").primaryKey(),
  stream: varchar("stream").notNull(),
  type: varchar("type").notNull(),
  data: jsonb("data").$type<EventRecord["data"]>().notNull(),
  meta: jsonb("meta").$type<EventRecord["meta"]>().notNull(),
  recorded: varchar("recorded").notNull(),
  created: varchar("created").notNull(),
}, (table) => [
  index().on(table.stream),
  index().on(table.type),
  index().on(table.recorded),
  index().on(table.created),
]);

export type PGEventTable = PgTableWithColumns<{
  name: "events";
  schema: "event_store";
  columns: {
    id: PgColumn<
      {
        name: "id";
        tableName: "events";
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
    stream: PgColumn<
      {
        name: "stream";
        tableName: "events";
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
    type: PgColumn<
      {
        name: "type";
        tableName: "events";
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
    data: PgColumn<
      {
        name: "data";
        tableName: "events";
        dataType: "json";
        columnType: "PgJsonb";
        data: Record<string, unknown>;
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
    meta: PgColumn<
      {
        name: "meta";
        tableName: "events";
        dataType: "json";
        columnType: "PgJsonb";
        data: Record<string, unknown>;
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
    recorded: PgColumn<
      {
        name: "recorded";
        tableName: "events";
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
    created: PgColumn<
      {
        name: "created";
        tableName: "events";
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
  };
  dialect: "pg";
}>;
