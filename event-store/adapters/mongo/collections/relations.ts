import z from "zod";

import type { CollectionRegistrar } from "../types.ts";

export const registrar: CollectionRegistrar = {
  name: "relations",
  indexes: [
    [
      {
        key: 1,
      },
    ],
    [
      {
        stream: 1,
      },
    ],
    [
      {
        key: 1,
        stream: 1,
      },
      {
        unique: true,
      },
    ],
  ],
};

export const schema = z.object({
  key: z.string(),
  streams: z.string().array(),
});

export type RelationSchema = {
  key: string;
  streams: string[];
};
