import { index, type SQLiteColumn, sqliteTable, type SQLiteTableWithColumns, text } from "drizzle-orm/sqlite-core";

export const events: SQLiteEventTable = sqliteTable("valkyr_events", {
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

export type SQLiteEventTable = SQLiteTableWithColumns<{
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
      isPrimaryKey: true;
      isAutoincrement: false;
      hasRuntimeDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
      generated: undefined;
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
      isPrimaryKey: false;
      isAutoincrement: false;
      hasRuntimeDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
      generated: undefined;
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
      isPrimaryKey: false;
      isAutoincrement: false;
      hasRuntimeDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
      generated: undefined;
    }>;
    data: SQLiteColumn<{
      name: "data";
      tableName: "valkyr_events";
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
    meta: SQLiteColumn<{
      name: "meta";
      tableName: "valkyr_events";
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
    recorded: SQLiteColumn<{
      name: "recorded";
      tableName: "valkyr_events";
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
    created: SQLiteColumn<{
      name: "created";
      tableName: "valkyr_events";
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
