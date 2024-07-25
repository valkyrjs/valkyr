import type { PGEventStore } from "~stores/pg/event-store.ts";
import type { SQLiteEventStore } from "~stores/sqlite/event-store.ts";
import type { ValkyrEventStore } from "~stores/valkyr/event-store.ts";

export type EventStoreAdapter = PGEventStore<any> | SQLiteEventStore<any> | ValkyrEventStore<any>;
