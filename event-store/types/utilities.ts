import type { Empty } from "./common.ts";

export type ExcludeEmptyFields<T> = {
  [K in keyof T as T[K] extends Empty ? never : K]: T[K];
};
