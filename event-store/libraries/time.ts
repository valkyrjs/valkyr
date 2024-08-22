import { HLC } from "./hlc.ts";
import { Timestamp } from "./timestamp.ts";

const clock = new HLC();

/**
 * Get a date object from given event meta timestamp.
 *
 * @param timestamp - Event meta timestamp.
 */
export function getDate(timestamp: string): Date {
  return new Date(getUnixTimestamp(timestamp));
}

/**
 * Get logical timestamp based on current time.
 */
export function getLogicalTimestamp(): string {
  const ts = clock.now().toJSON();
  return `${ts.time}-${String(ts.logical).padStart(5, "0")}`;
}

/**
 * Get timestamp instance from provided logical timestamp.
 *
 * @param ts - Logical timestamp to convert.
 */
export function getTimestamp(ts: string): Timestamp {
  const [time, logical] = ts.split("-");
  return new Timestamp(time, Number(logical));
}

/**
 * Get unix timestamp value from provided logical timestamp.
 *
 * @param ts - Logical timestamp to convert.
 */
export function getUnixTimestamp(ts: string): number {
  return getTimestamp(ts).time;
}
