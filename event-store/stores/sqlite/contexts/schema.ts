import { index, type SQLiteColumn, sqliteTable, type SQLiteTableWithColumns, text } from "drizzle-orm/sqlite-core";

export const contexts: Table = sqliteTable("valkyr_contexts", {
  key: text("key").notNull(),
  stream: text("stream").notNull(),
}, (table) => ({
  keyIdx: index("valkyr_contexts_key_idx").on(table.key),
}));

type Table = SQLiteTableWithColumns<{
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
      enumValues: [string, ...string[]];
      baseColumn: never;
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
      enumValues: [string, ...string[]];
      baseColumn: never;
    }>;
  };
  dialect: "sqlite";
}>;
