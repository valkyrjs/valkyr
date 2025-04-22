import type { Helper } from "postgres";

import type { Snapshot, SnapshotsProvider } from "~types/providers/snapshots.ts";

import type { PostgresDatabase } from "../database.ts";

type PGSnapshot = Omit<Snapshot, "state"> & { state: string };

export class PostgresSnapshotsProvider implements SnapshotsProvider {
  constructor(readonly db: PostgresDatabase, readonly schema?: string) {}

  get table(): Helper<string, []> {
    if (this.schema !== undefined) {
      return this.db.sql(`${this.schema}.snapshots`);
    }
    return this.db.sql("public.snapshots");
  }

  /**
   * Add snapshot state under given reducer stream.
   *
   * @param name   - Name of the reducer the snapshot is attached to.
   * @param stream - Stream the snapshot is attached to.
   * @param cursor - Cursor timestamp for the last event used in the snapshot.
   * @param state  - State of the reduced events.
   */
  async insert(name: string, stream: string, cursor: string, state: any): Promise<void> {
    await this.db.sql`
      INSERT INTO ${this.table} ${this.db.sql(this.#toDriver({ name, stream, cursor, state }))}`.catch((error) => {
      throw new Error(`EventStore > 'snapshots.insert' failed with postgres error: ${error.message}`);
    });
  }

  /**
   * Get snapshot state by stream.
   *
   * @param name   - Name of the reducer which the state was created.
   * @param stream - Stream the state was reduced for.
   */
  async getByStream(name: string, stream: string): Promise<Snapshot | undefined> {
    return this.db.sql<PGSnapshot[]>`SELECT * FROM ${this.table} WHERE name = ${name} AND stream = ${stream}`.then(
      this.#fromDriver,
    )
      .then(([snapshot]) => snapshot).catch((error) => {
        throw new Error(`EventStore > 'snapshots.getByStream' failed with postgres error: ${error.message}`);
      });
  }

  /**
   * Removes a snapshot for the given reducer stream.
   *
   * @param name   - Name of the reducer the snapshot is attached to.
   * @param stream - Stream to remove from snapshots.
   */
  async remove(name: string, stream: string): Promise<void> {
    await this.db.sql`DELETE FROM ${this.table} WHERE name = ${name} AND stream = ${stream}`.catch((error) => {
      throw new Error(`EventStore > 'snapshots.remove' failed with postgres error: ${error.message}`);
    });
  }

  /*
   |--------------------------------------------------------------------------------
   | Parsers
   |--------------------------------------------------------------------------------
   */

  #fromDriver(snapshots: PGSnapshot[]): Snapshot[] {
    return snapshots.map((snapshot) => {
      snapshot.state = typeof snapshot.state === "string" ? JSON.parse(snapshot.state) : snapshot.state;
      return snapshot as unknown as Snapshot;
    });
  }

  #toDriver(snapshot: Snapshot): object {
    return {
      ...snapshot,
      state: JSON.stringify(snapshot.state),
    };
  }
}
