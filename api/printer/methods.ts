import { toCamelCase, toPascalCase } from "@std/text";
import { ZodObject, type ZodTypeAny } from "zod";

import type { Method } from "~libraries/method.ts";
import { getMappedMethods } from "~utilities/methods.ts";

export function resolveMethods(methods: Method[]) {
  const result: string[] = [];
  // deno-lint-ignore no-explicit-any
  const map: any = getMappedMethods(methods);
  for (const key in map) {
    result.push(`
      readonly ${toCamelCase(key)} = {
        ${getMethods(map[key], [])}
      };
    `.trim());
  }
  return result;
}

// deno-lint-ignore no-explicit-any
function getMethods(map: any, path: string[] = []): string {
  const result: string[] = [];
  for (const name in map) {
    const value = map[name];
    if (name === "methods") {
      result.push(map[name].map((method: Method) => getRouteMethod(method, path)).join(",\n\n"));
    } else {
      result.push(addMethod(name, value, path));
    }
  }
  return result.join(",\n\n");
}

// deno-lint-ignore no-explicit-any
function addMethod(name: string, map: any, path: string[] = []): string {
  return `${toCamelCase(name)}: {
    ${getMethods(map, [...path, name])}
  }`.trim();
}

function getRouteMethod(method: Method, paths: string[]): string {
  const name = toCamelCase(method.file);
  const namespace = toPascalCase(method.location[0]);
  const args = getRequestArguments(namespace, method, paths);
  const response = getResponseType(method);

  const data: string[] = [];
  if (method.params !== undefined) {
    data.push("params");
  }

  if (method.notification === true) {
    return `
    ${getMethodDoc(method)}
    ${name}: async (${args}): Promise<void> => {
      return this.#request({
        method: "${method.method}",
        ${data.join(",")}
      } as Notification<any>);
    }
  `.trim();
  }

  return `
    ${getMethodDoc(method)}
    ${name}: async (${args}): Promise<${namespace}${getTypePaths(paths)}["${response}"]["Response"]> => {
      return this.#request({
        method: "${method.method}",
        ${data.join(",")},
        id: this.#getId(),
      } as Request<any>);
    }
  `.trim();
}

function getMethodDoc(method: Method): string {
  const docs: string[] = ["/**"];

  if (method.description !== undefined) {
    const lines = method.description.trim().split("\n");
    for (const line of lines) {
      docs.push(`* ${line.trim()}`);
    }
  }

  // ### Params

  const longest = getLongestParam(method);
  const pad = getPadder(longest + 1);
  if (longest !== 0) {
    docs.push("*");
  }

  const params = method.params;
  if (params !== undefined) {
    if (params instanceof ZodObject) {
      for (const [name, value] of Object.entries<ZodTypeAny>(params.shape)) {
        docs.push(
          `* @param ${name}${pad(name.length)} - ${value.description ?? "URL parameter added to the request."}`,
        );
      }
    }
  }

  // ### Examples

  if (method.examples !== undefined) {
    for (const example of method.examples) {
      docs.push("*");
      docs.push("* @example");
      docs.push("* ```ts");
      const lines = example.trim().split("\n");
      for (const line of lines) {
        docs.push(`* ${line}`);
      }
      docs.push("* ```");
    }
  }

  if (docs.length > 0) {
    docs.push("*/");
    return docs.join("\n");
  }
  return "";
}

function getLongestParam(method: Method): number {
  let longest = 0;

  const schema = method.params;
  if (schema !== undefined) {
    if (schema instanceof ZodObject) {
      for (const [name] of Object.entries<ZodTypeAny>(schema.shape)) {
        const length = name.length;
        if (length > longest) {
          longest = length;
        }
      }
    }
  }

  return longest;
}

function getPadder(size: number) {
  return function pad(length: number) {
    return new Array(size - length).fill("").join(" ");
  };
}

/**
 * Get function arguments as a typed string from the provided methodr.
 *
 * @param namespace - Namespace the module types are defined under.
 * @param method    - Route to extract parameters for.
 * @param paths     - Originating paths in which the argument is found.
 */
function getRequestArguments(namespace: string, method: Method, paths: string[]): string {
  const result: string[] = [];
  if (method.params !== undefined) {
    result.push(`params: ${namespace}${getTypePaths(paths)}["${toPascalCase(method.file)}"]["Params"]`);
  }
  return result.join(",");
}

function getResponseType({ file }: Method): string {
  return `${toPascalCase(file)}`;
}

function getTypePaths(paths: string[]) {
  return paths.map((step) => `["${toPascalCase(step)}"]`).join("");
}
