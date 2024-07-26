import fs from "node:fs/promises";
import { join } from "node:path";

import { ensureDir, hasFolder } from "../fs/mod.ts";
import { getModuleMeta } from "../utilities/jsr.ts";

/**
 * Prepares the migration files for execution by placing them in the
 * given output target.
 *
 * @param meta   - Import meta to extract directory name from.
 * @param output - Location to place the migration files.
 * @param name   - Name of the module being migrated.
 */
export async function prepareMigrationFiles(meta: ImportMeta, output: string, name: string): Promise<void> {
  if (await hasFolder(output)) {
    await fs.rm(output, { recursive: true });
  }
  await ensureDir(output);
  if (meta.dirname !== undefined) {
    return copyLocalMigrationFiles(join(meta.dirname, "migrations", "out"), output);
  }
  if (meta.url !== undefined && isRemoteUrl(meta.url, name)) {
    return copyRemoteMigrationFiles(meta.url, output, name);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Helpers
 |--------------------------------------------------------------------------------
 */

function isRemoteUrl(url: string, name: string) {
  return url.includes(`https://jsr.io/@valkyr/${name}`);
}

async function copyLocalMigrationFiles(source: string, destination: string): Promise<void> {
  await fs.cp(source, destination, { recursive: true });
}

async function copyRemoteMigrationFiles(url: string, destination: string, name: string): Promise<void> {
  const [version, , target] = url.replace(`https://jsr.io/@valkyr/${name}/`, "").split("/");
  const { manifest } = await getModuleMeta(name, version);
  for (const key in manifest) {
    if (key.includes(`stores/${target}/migrations/out`) === true && key.endsWith(".ts") === false) {
      const dest = join(destination, key.replace(`/stores/${target}/migrations/out`, ""));
      const file = await getRemoteFile(`https://jsr.io/@valkyr/${name}/${version}${key}`);
      await ensureDir(dest);
      await fs.writeFile(dest, file, "utf-8");
    }
  }
}

async function getRemoteFile(url: string): Promise<any> {
  const res = await fetch(url);
  if (res.status !== 200) {
    throw new Error("Failed to fetch migration file");
  }
  return res.text();
}
