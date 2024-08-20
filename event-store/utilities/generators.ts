import { nanoid } from "nanoid";

/**
 * Generate a return a new random stream id.
 *
 * @param size - Size of the id. Default: 11
 */
export function makeId(size: number = 11): string {
  return nanoid(size);
}
