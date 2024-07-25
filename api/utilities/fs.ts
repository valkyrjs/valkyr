import { lstat, mkdir, readdir } from "node:fs/promises";

/**
 * Check if a folder exists under the given path.
 *
 * @param path - Path to check.
 */
export async function hasFolder(path: string) {
  return lstat(path).then(() => true).catch(() => false);
}

/**
 * Ensure that a directory exists under the given path.
 *
 * @param path - Path to ensure.
 */
export async function ensureDir(path: string): Promise<void> {
  const target = path.split("/").slice(0, -1).join("/");
  const dir = await readdir(target).catch(() => undefined);
  if (dir === undefined) {
    await mkdir(target, { recursive: true });
  }
}
