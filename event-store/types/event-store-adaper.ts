import type { BrowserEventStore } from "~stores/browser/event-store.ts";
import type { PostgresEventStore } from "~stores/postgres/event-store.ts";

export type EventStoreAdapter = PostgresEventStore<any> | BrowserEventStore<any>;
