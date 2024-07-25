/**
 * Take the first entity out of a drizzle-orm select result.
 *
 * @param rows - Resulting rows from a select query.
 *
 * @example
 * ```ts
 * import { takeOne } from "@valkyr/toolkit/drizzle";
 *
 * const user = await db.select().from(schema).where(eq(schema.id, "xyz")).then(takeOne);
 * ```
 */
export function takeOne<TSchema extends Record<string, unknown>>(
  rows: TSchema[],
): TSchema | undefined {
  return rows[0];
}
