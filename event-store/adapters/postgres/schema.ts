import { index, jsonb, pgSchema, serial, unique, varchar } from "drizzle-orm/pg-core";

import type { EventRecord } from "../../types/event.ts";
import type { EventStoreSchema } from "./types.ts";

/**
 * Generates drizzle-orm compatible event store table definitions under the
 * given schema namespace.
 *
 * @param name - Schema name to create tables under.
 */
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
