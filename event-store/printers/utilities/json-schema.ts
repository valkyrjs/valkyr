import type { JSONSchema4, JSONSchema4Type } from "json-schema";

export const jsonSchema = {
  compile,
  propertyNames,
};

function compile(schema: JSONSchema4): string {
  if (schema.$ref) {
    return schema.$ref.replace("#/definitions/", "");
  }
  if (schema.anyOf !== undefined) {
    return `(${schema.anyOf.map(compile).join(" | ")})`;
  }
  if (schema.const !== undefined) {
    switch (typeof schema.const) {
      case "number": {
        return schema.const;
      }
      default: {
        return `"${schema.const}"`;
      }
    }
  }
  switch (schema.type) {
    case "object": {
      if (schema.properties === undefined) {
        throw new Error("Missing properties in schema object");
      }
      if (Object.keys(schema.properties).length === 0 && schema.additionalProperties === true) {
        return "any";
      }
      const properties: string[] = [];
      for (const property in schema.properties) {
        const data = schema.properties[property];
        const optional = data.optional === true ? "?" : "";
        properties.push(`${property}${optional}: ${compile(data)}`);
      }
      return `{ ${properties.join("\n")} }`;
    }
    case "array": {
      if (schema.items === undefined) {
        throw new Error("Missing items in schema array");
      }
      if (Array.isArray(schema.items) === true) {
        const types: string[] = [];
        for (const item of schema.items) {
          types.push(compile(item));
        }
        return `[${types.join(", ")}]`;
      }
      return `(${compile(schema.items)})[]`;
    }
    default: {
      if (schema.enum !== undefined) {
        return compileEnum(schema.enum);
      }
      if (typeof schema.type === "string") {
        return schema.type;
      }
      if (Array.isArray(schema.type) === true) {
        return schema.type.join(" | ");
      }
      return "unknown";
    }
  }
}

function compileEnum(types: JSONSchema4Type[]): string {
  const values: string[] = [];
  for (const type of types) {
    if (Array.isArray(type) === true) {
      values.push(`(${compileEnum(type)})[]`);
    } else {
      values.push(JSON.stringify(type));
    }
  }
  return values.join(" | ");
}

function propertyNames(properties: any): string[] {
  return Object.keys(properties);
}
