import { index, jsonb, type PgColumn, type PgTableWithColumns, varchar } from "drizzle-orm/pg-core";

import type { EventRecord } from "~types/event.ts";

import { schema } from "../schema.ts";

export const events: Table = schema.table("events", {
  id: varchar("id").primaryKey(),
  stream: varchar("stream").notNull(),
  type: varchar("type").notNull(),
  data: jsonb("data").$type<EventRecord["data"]>().notNull(),
  meta: jsonb("meta").$type<EventRecord["meta"]>().notNull(),
  recorded: varchar("recorded").notNull(),
  created: varchar("created").notNull(),
}, (table) => ({
  streamIdx: index().on(table.stream),
  typeIdx: index().on(table.type),
  recordedIdx: index().on(table.recorded),
  createdIdx: index().on(table.created),
}));

type Table = PgTableWithColumns<{
  name: "events";
  schema: "event_store";
  columns: {
    id: PgColumn<{
      name: "id";
      tableName: "events";
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
      tableName: "events";
      dataType: "string";
      columnType: "PgVarchar";
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
    }>;
    type: PgColumn<{
      name: "type";
      tableName: "events";
      dataType: "string";
      columnType: "PgVarchar";
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
    }>;
    data: PgColumn<{
      name: "data";
      tableName: "events";
      dataType: "json";
      columnType: "PgJsonb";
      data: EventRecord["data"];
      driverParam: unknown;
      notNull: true;
      hasDefault: false;
      enumValues: undefined;
      baseColumn: never;
    }>;
    meta: PgColumn<{
      name: "meta";
      tableName: "events";
      dataType: "json";
      columnType: "PgJsonb";
      data: EventRecord["meta"];
      driverParam: unknown;
      notNull: true;
      hasDefault: false;
      enumValues: undefined;
      baseColumn: never;
    }>;
    recorded: PgColumn<{
      name: "recorded";
      tableName: "events";
      dataType: "string";
      columnType: "PgVarchar";
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
    }>;
    created: PgColumn<{
      name: "created";
      tableName: "events";
      dataType: "string";
      columnType: "PgVarchar";
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
    }>;
  };
  dialect: "pg";
}>;
