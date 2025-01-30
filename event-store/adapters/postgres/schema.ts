import { index, jsonb, type PgColumn, pgSchema, type PgTableWithColumns, serial, unique, varchar } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type { EventRecord } from "../../types/event.ts";
import { PostgresDatabase as DrizzlePostgresDatabase } from "./database.ts";

export function getEventStoreSchema<TName extends string>(name: TName): EventStoreSchema<TName> {
  const schema = pgSchema(name);
  return {
    events: schema.table("events", {
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
    ]),
    relations: schema.table("relations", {
      id: serial("id").primaryKey(),
      key: varchar("key").notNull(),
      stream: varchar("stream").notNull(),
    }, (table) => [
      index().on(table.key),
      index().on(table.stream),
      unique().on(table.key, table.stream),
    ]),
    snapshots: schema.table("snapshots", {
      id: serial("id").primaryKey(),
      name: varchar("name").notNull(),
      stream: varchar("stream").notNull(),
      cursor: varchar("cursor").notNull(),
      state: jsonb("state").$type<Record<string, any>>().notNull(),
    }, (table) => [
      index().on(table.name, table.stream, table.cursor),
    ]),
  };
}

/*
 |--------------------------------------------------------------------------------
 | Schema
 |--------------------------------------------------------------------------------
 */

export type Event = EventStoreSchema["events"]["$inferSelect"];
export type Relation = EventStoreSchema["relations"]["$inferSelect"];
export type Snapshot = EventStoreSchema["snapshots"]["$inferSelect"];

/*
 |--------------------------------------------------------------------------------
 | Event Store
 |--------------------------------------------------------------------------------
 */

export type PostgresDatabase = DrizzlePostgresDatabase<EventStoreSchema>;

export type EventStoreDatabase = PostgresJsDatabase<EventStoreSchema>;

export type Transaction = Parameters<Parameters<EventStoreDatabase["transaction"]>[0]>[0];

export type EventStoreSchema<TName extends string = string> = {
  events: EventsTable<TName>;
  relations: RelationsTable<TName>;
  snapshots: SnapshotsTable<TName>;
};

/*
 |--------------------------------------------------------------------------------
 | Tables
 |--------------------------------------------------------------------------------
 */

export type EventsTable<TName extends string = string> = PgTableWithColumns<{
  name: "events";
  schema: TName;
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

export type RelationsTable<TName extends string = string> = PgTableWithColumns<{
  name: "relations";
  schema: TName;
  columns: {
    id: PgColumn<
      {
        name: "id";
        tableName: "relations";
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
    key: PgColumn<
      {
        name: "key";
        tableName: "relations";
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
        tableName: "relations";
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

export type SnapshotsTable<TName extends string = string> = PgTableWithColumns<{
  name: "snapshots";
  schema: TName;
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
