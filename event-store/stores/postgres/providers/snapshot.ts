import { takeOne } from "@valkyr/drizzle";
import { and, eq } from "drizzle-orm";

import type { PostgresDatabase, Transaction as PGTransaction } from "../database.ts";
import type { PGSnapshotTable, Snapshot } from "../schemas/snapshots.ts";

export class SnapshotProvider {
  constructor(readonly db: PostgresDatabase | PGTransaction, readonly schema: PGSnapshotTable) {}

  /**
   * Access drizzle query features for snapshot provider.
   */
  get query(): this["db"]["query"] {
    return this.db.query;
  }

  /**
   * Add snapshot state under given reducer stream.
   *
   * @param name   - Name of the reducer the snapshot is attached to.
   * @param stream - Stream the snapshot is attached to.
   * @param cursor - Cursor timestamp for the last event used in the snapshot.
   * @param state  - State of the reduced events.
   */
  async insert(name: string, stream: string, cursor: string, state: Record<string, unknown>): Promise<void> {
    await this.db.insert(this.schema).values({ name, stream, cursor, state });
  }

  /**
   * Get snapshot state by stream.
   *
   * @param name   - Name of the reducer which the state was created.
   * @param stream - Stream the state was reduced for.
   */
  async getByStream(name: string, stream: string): Promise<Snapshot | undefined> {
    return this.db.select().from(this.schema).where(and(eq(this.schema.name, name), eq(this.schema.stream, stream))).then(takeOne);
  }

  /**
   * Removes a snapshot for the given reducer stream.
   *
   * @param name   - Name of the reducer the snapshot is attached to.
   * @param stream - Stream to remove from snapshots.
   */
  async remove(name: string, stream: string): Promise<void> {
    await this.db.delete(this.schema).where(and(eq(this.schema.name, name), eq(this.schema.stream, stream)));
  }
}
