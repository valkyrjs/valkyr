import type { EventRecord } from "./event.ts";

export type ContextHandler<TRecord extends EventRecord> = (record: TRecord) => Promise<Omit<Context, "stream">[]>;

export type Context = {
  key: string;
  op: "insert" | "remove";
  stream: string;
};
