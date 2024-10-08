import { index, type SQLiteColumn, sqliteTable, type SQLiteTableWithColumns, text } from "drizzle-orm/sqlite-core";

export const contexts: SQLiteContextTable = sqliteTable("valkyr_contexts", {
  key: text("key").notNull(),
  stream: text("stream").notNull(),
}, (table) => ({
  keyIdx: index("valkyr_contexts_key_idx").on(table.key),
}));

export type SQLiteContextTable = SQLiteTableWithColumns<{
  name: "valkyr_contexts";
  schema: undefined;
  columns: {
    key: SQLiteColumn<{
      name: "key";
      tableName: "valkyr_contexts";
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
      tableName: "valkyr_contexts";
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
  };
  dialect: "sqlite";
}>;
