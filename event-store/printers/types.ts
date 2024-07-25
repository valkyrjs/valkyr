import { pascalcase } from "pascalcase";

import type { Config } from "./asserts/events.ts";
import { jsonSchema } from "./utilities/json-schema.ts";

/**
 * Takes event configuration and return a new event type.
 *
 * @param event - Event to print.
 */
export function getEventType(event: Config["event"]) {
  let data = "Empty";
  if (event.data !== undefined && Object.keys(event.data).length > 0) {
    data = jsonSchema.compile({
      type: "object",
      properties: event.data,
    });
  }
  let meta = "Empty";
  if (event.meta !== undefined && Object.keys(event.meta).length > 0) {
    meta = jsonSchema.compile({
      type: "object",
      properties: event.meta,
    });
  }
  return `export type ${pascalcase(event.type)} = TEvent<"${event.type}", ${data}, ${meta}>;`;
}

/**
 * Takes event configuration and returns any external import requirements it may have.
 *
 * @param configs - Configs to get imports from.
 */
export function getImports(configs: any[]) {
  const imports: any = {};
  for (const config of configs) {
    for (const key in config.imports ?? {}) {
      if (imports[key] === undefined) {
        imports[key] = new Set<string>();
      }
      config.imports[key].forEach((value: string) => imports[key].add(value));
    }
  }
  const output: string[] = [];
  for (const key in imports) {
    output.push(`import type { ${Array.from(imports[key]).join(", ")} } from "${key}";`);
  }
  return output;
}
