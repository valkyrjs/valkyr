import { z } from "zod";

export const session = z.object({
  accountId: z.string(),
});

export type Session = z.infer<typeof session>;
