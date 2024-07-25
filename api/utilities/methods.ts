import { readdir } from "node:fs/promises";

import { getProperty, setProperty } from "dot-prop";

import { Method } from "~libraries/method.ts";

import { getModules } from "./modules.ts";

/**
 * Get a method map from the provided methods.
 *
 * @param methods - Methods to map.
 */
export function getMappedMethods(methods: Method[]) {
  const map = {};
  for (const method of methods) {
    const location = [...method.location, "methods"].join(".");
    const container: Method[] | undefined = getProperty(map, location);
    if (container === undefined) {
      setProperty(map, location, [method]);
    } else {
      container.push(method);
      setProperty(map, location, container);
    }
  }
  return map;
}

/**
 * Resolve and return all methods that has been created under any 'methods'
 * folders that can be found under the given path.
 *
 * If the filter is empty, all paths are resolved, otherwise only paths
 * declared in the array is resolved.
 *
 * @param path    - Path to resolve methods from.
 * @param filter  - List of paths to include if not empty.
 * @param methods - List of methods that has been resolved.
 */
export async function resolveMethods(path: string, filter: string[] = [], methods: Method[] = []): Promise<Method[]> {
  const modules = await getModules(path, filter);
  for (const { name, path } of modules) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isDirectory() === true && entry.name === "methods") {
        await loadMethods(`${path}/methods`, methods, [name]);
      }
    }
  }
  return methods;
}

async function loadMethods(path: string, methods: Method[], modules: string[]): Promise<void> {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.isDirectory() === true) {
      await loadMethods(`${path}/${entry.name}`, methods, [...modules, entry.name]);
    } else {
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".js")) {
        return;
      }
      const { default: method } = await import(`${path}/${entry.name}`) as { default: Method };
      if (method instanceof Method === false) {
        throw new Error(
          `Method Violation: Could not load '${path}/${entry.name}' as it does not export a default Method instance.`,
        );
      }
      method.meta(entry.name.replace(".ts", ""), [...modules]);
      methods.push(method);
    }
  }
}
