import { z } from "zod";

import { Action } from "~libraries/action.ts";

export function getName(name: string) {
  return new Action({
    name: "hasName",
    output: z.object({ name: z.string() }),
    handler: async () => {
      return { name };
    },
  });
}
