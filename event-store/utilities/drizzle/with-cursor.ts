import { PgSelectQueryBuilder } from "drizzle-orm/pg-core";
import { SQLiteSelectQueryBuilder } from "drizzle-orm/sqlite-core";

export function withCursor<T extends (PgSelectQueryBuilder | SQLiteSelectQueryBuilder) = any>(qb: T, cursor: string, direction: "asc" | "desc" | undefined): T {
  if (direction === "desc") {
    return qb.where(lt(schema.created, cursor));
  }
  return qb.where(gt(schema.created, cursor));
}
