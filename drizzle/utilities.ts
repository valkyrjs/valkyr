import { nanoid } from "nanoid";

/**
 * Generate a new nanoid.
 *
 * @param size - Size of the id. Default: 11
 */
export function makeId(size: number = 11): string {
  return nanoid(size);
}

/**
 * Take the first entity out of a drizzle-orm select result.
 *
 * @param rows - Resulting rows from a select query.
 *
 * @example
 * ```ts
 * import { takeOne } from "@valkyr/drizzle";
 *
 * const user = await db.select().from(users).where(eq(users.id, "xyz")).then(takeOne);
 * ```
 */
export function takeOne<TSchema extends Record<string, unknown>>(
  rows: TSchema[],
): TSchema | undefined {
  return rows[0];
}
