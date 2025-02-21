import type { PgColumn, PgSchema, PgTableWithColumns } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type { PostgresDatabase as DrizzlePostgresDatabase } from "./database.ts";

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
  schema: PgSchema<TName>;
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
