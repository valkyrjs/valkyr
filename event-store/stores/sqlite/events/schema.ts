import { index, type SQLiteColumn, sqliteTable, type SQLiteTableWithColumns, text } from "drizzle-orm/sqlite-core";

export const events: Table = sqliteTable("valkyr_events", {
  id: text("id").primaryKey(),
  stream: text("stream").notNull(),
  type: text("type").notNull(),
  data: text("data", { mode: "json" }).$type<Record<string, any>>().notNull(),
  meta: text("meta", { mode: "json" }).$type<Record<string, any>>().notNull(),
  recorded: text("recorded").notNull(),
  created: text("created").notNull(),
}, (table) => ({
  streamIdx: index("valkyr_events_stream_idx").on(table.stream),
  typeIdx: index("valkyr_events_type_idx").on(table.type),
  recordedIdx: index("valkyr_events_recorded_idx").on(table.recorded),
  createdIdx: index("valkyr_events_created_idx").on(table.created),
}));

type Table = SQLiteTableWithColumns<{
  name: "valkyr_events";
  schema: undefined;
  columns: {
    id: SQLiteColumn<{
      name: "id";
      tableName: "valkyr_events";
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
      tableName: "valkyr_events";
      dataType: "string";
      columnType: "SQLiteText";
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
    }>;
    type: SQLiteColumn<{
      name: "type";
      tableName: "valkyr_events";
      dataType: "string";
      columnType: "SQLiteText";
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
    }>;
    data: SQLiteColumn<{
      name: "data";
      tableName: "valkyr_events";
      dataType: "json";
      columnType: "SQLiteTextJson";
      data: Record<string, any>;
      driverParam: unknown;
      notNull: true;
      hasDefault: false;
      enumValues: undefined;
      baseColumn: never;
    }>;
    meta: SQLiteColumn<{
      name: "meta";
      tableName: "valkyr_events";
      dataType: "json";
      columnType: "SQLiteTextJson";
      data: Record<string, any>;
      driverParam: unknown;
      notNull: true;
      hasDefault: false;
      enumValues: undefined;
      baseColumn: never;
    }>;
    recorded: SQLiteColumn<{
      name: "recorded";
      tableName: "valkyr_events";
      dataType: "string";
      columnType: "SQLiteText";
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
    }>;
    created: SQLiteColumn<{
      name: "created";
      tableName: "valkyr_events";
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
