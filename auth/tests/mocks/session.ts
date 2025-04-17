import z from "zod";

export const session = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("admin"),
    accountId: z.string(),
    super: z.boolean(),
  }),
  z.object({
    type: z.literal("user"),
    accountId: z.string(),
  }),
]);

export type Session = z.infer<typeof session>;
