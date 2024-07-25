import { readdir } from "node:fs/promises";

export async function getModules(
  path: string,
  filter: string[] = [],
): Promise<ModuleEntry[]> {
  const result: ModuleEntry[] = [];
  for await (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.isDirectory() === true) {
      if (filter.length > 0 && filter.includes(entry.name) === false) {
        continue;
      }
      result.push({ name: entry.name, path: `${path}/${entry.name}` });
    }
  }
  return result;
}

type ModuleEntry = {
  name: string;
  path: string;
};
