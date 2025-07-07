import z from "zod/v4";

import type { CollectionRegistrar } from "../types.ts";

export const registrar: CollectionRegistrar = {
  name: "snapshots",
  indexes: [
    [
      {
        name: 1,
        stream: 1,
        cursor: 1,
      },
    ],
  ],
};

export const schema = z.object({
  name: z.string(),
  stream: z.string(),
  cursor: z.string(),
  state: z.record(z.string(), z.any()),
});

export type SnapshotSchema = {
  name: string;
  stream: string;
  cursor: string;
  state: Record<string, any>;
};
