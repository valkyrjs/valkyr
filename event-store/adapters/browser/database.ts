import { IndexedDatabase, MemoryDatabase } from "@valkyr/db";

import type { EventRecord } from "~types/event.ts";

export function getEventStoreDatabase(name: string, adapter: Adapter): EventStoreDB {
  switch (adapter) {
    case "indexeddb": {
      return new IndexedDatabase<Collections>({
        name,
        version: 1,
        registrars: [
          {
            name: "events",
            indexes: [
              ["stream", { unique: false }],
              ["created", { unique: false }],
              ["recorded", { unique: false }],
            ],
          },
          {
            name: "relations",
            indexes: [
              ["key", { unique: false }],
              ["stream", { unique: false }],
            ],
          },
          {
            name: "snapshots",
            indexes: [
              ["name", { unique: false }],
              ["stream", { unique: false }],
              ["cursor", { unique: false }],
            ],
          },
        ],
      });
    }
    case "memorydb": {
      return new MemoryDatabase<Collections>({
        name,
        registrars: [
          { name: "events" },
          { name: "relations" },
          { name: "snapshots" },
        ],
      });
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type EventStoreDB = IndexedDatabase<Collections> | MemoryDatabase<Collections>;

export type Adapter = "indexeddb" | "memorydb";

export type Collections = {
  events: EventRecord;
  relations: Relation;
  snapshots: Snapshot;
};

export type Relation = {
  key: string;
  stream: string;
};

export type Snapshot = {
  name: string;
  stream: string;
  cursor: string;
  state: Record<string, unknown>;
};
