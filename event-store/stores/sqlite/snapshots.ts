import { index, type SQLiteColumn, sqliteTable, type SQLiteTableWithColumns, text } from "drizzle-orm/sqlite-core";

export const snapshots: SQLiteSnapshotTable = sqliteTable("valkyr_snapshots", {
  name: text("name").notNull(),
  stream: text("stream").notNull(),
  cursor: text("cursor").notNull(),
  state: text("state", { mode: "json" }).$type<Record<string, any>>().notNull(),
}, (table) => ({
  nameStreamCursorIdx: index("valkyr_snapshots_name_stream_cursor_idx").on(table.name, table.stream, table.cursor),
}));

export type Snapshot = typeof snapshots.$inferSelect;

export type SQLiteSnapshotTable = SQLiteTableWithColumns<{
  name: "valkyr_snapshots";
  schema: undefined;
  columns: {
    name: SQLiteColumn<{
      name: "name";
      tableName: "valkyr_snapshots";
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
    stream: SQLiteColumn<{
      name: "stream";
      tableName: "valkyr_snapshots";
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
    cursor: SQLiteColumn<{
      name: "cursor";
      tableName: "valkyr_snapshots";
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
    state: SQLiteColumn<{
      name: "state";
      tableName: "valkyr_snapshots";
      dataType: "json";
      columnType: "SQLiteTextJson";
      data: Record<string, any>;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      isPrimaryKey: false;
      isAutoincrement: false;
      hasRuntimeDefault: false;
      enumValues: undefined;
      baseColumn: never;
      generated: undefined;
    }>;
  };
  dialect: "sqlite";
}>;
