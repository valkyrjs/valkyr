import { index, type PgColumn, type PgTableWithColumns, serial, varchar } from "drizzle-orm/pg-core";

import { schema } from "../schema.ts";

export const relations: PGRelationsTable = schema.table("relations", {
  id: serial("id").primaryKey(),
  key: varchar("key").notNull(),
  stream: varchar("stream").notNull(),
}, (table) => [
  index().on(table.key),
  index().on(table.stream),
]);

export type PGRelationsTable = PgTableWithColumns<{
  name: "relations";
  schema: "event_store";
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
