export type SnapshotsProvider = {
  /**
   * Add snapshot state under given reducer stream.
   *
   * @param name   - Name of the reducer the snapshot is attached to.
   * @param stream - Stream the snapshot is attached to.
   * @param cursor - Cursor timestamp for the last event used in the snapshot.
   * @param state  - State of the reduced events.
   */
  insert(name: string, stream: string, cursor: string, state: Record<string, unknown>): Promise<void>;

  /**
   * Get snapshot state by stream.
   *
   * @param name   - Name of the reducer which the state was created.
   * @param stream - Stream the state was reduced for.
   */
  getByStream(name: string, stream: string): Promise<Snapshot | undefined>;

  /**
   * Removes a snapshot for the given reducer stream.
   *
   * @param name   - Name of the reducer the snapshot is attached to.
   * @param stream - Stream to remove from snapshots.
   */
  remove(name: string, stream: string): Promise<void>;
};

export type Snapshot = {
  stream: string;
  name: string;
  cursor: string;
  state: Record<string, unknown>;
};
