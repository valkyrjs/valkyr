import { a, type ASchema } from "@arrirpc/schema";

export type CompiledASchema<T extends ASchema> = ReturnType<typeof a.compile<T>>;
