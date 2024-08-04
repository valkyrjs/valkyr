import { type Database, takeOne } from "@valkyr/toolkit/drizzle";
import { and, eq } from "drizzle-orm";

import type { EventStoreDB, Transaction } from "../database.ts";
import { type Snapshot, snapshots as schema } from "./schema.ts";

export class SnapshotProvider {
  constructor(readonly db: Database<EventStoreDB> | Transaction) {}

  /**
   * Add snapshot state under given reducer stream.
   *
   * @param name   - Name of the reducer the snapshot is attached to.
   * @param stream - Stream the snapshot is attached to.
   * @param cursor - Cursor timestamp for the last event used in the snapshot.
   * @param state  - State of the reduced events.
   */
  async insert(name: string, stream: string, cursor: string, state: Record<string, unknown>): Promise<void> {
    await this.db.insert(schema).values({ name, stream, cursor, state });
  }

  /**
   * Get snapshot state by stream.
   *
   * @param name   - Name of the reducer which the state was created.
   * @param stream - Stream the state was reduced for.
   */
  async getByStream(name: string, stream: string): Promise<Snapshot | undefined> {
    return this.db.select().from(schema).where(and(eq(schema.name, name), eq(schema.stream, stream))).then(takeOne);
  }

  /**
   * Removes a snapshot for the given reducer stream.
   *
   * @param name   - Name of the reducer the snapshot is attached to.
   * @param stream - Stream to remove from snapshots.
   */
  async remove(name: string, stream: string): Promise<void> {
    await this.db.delete(schema).where(and(eq(schema.name, name), eq(schema.stream, stream)));
  }
}
