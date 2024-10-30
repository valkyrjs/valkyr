import type { EventRecord } from "./event.ts";

export type RelationHandler<TRecord extends EventRecord> = (record: TRecord) => Promise<Omit<Relation, "stream">[]>;

export type RelationPayload = Omit<Relation, "op">;

export type Relation = {
  op: "insert" | "remove";
  key: string;
  stream: string;
};
