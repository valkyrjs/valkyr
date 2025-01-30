import { Ajv } from "ajv";
import type { JSONSchema4 } from "json-schema";

class EventConfigAssertionError extends Error {
  constructor(message: string, readonly error?: unknown) {
    super(`Config Assertion Error: ${message}`);
  }
}

export function assertEventSchemas(schemas: any[]): asserts schemas is EventSchema[] {
  for (const schema of schemas) {
    assertEventSchema(schema);
  }
}

export function assertEventSchema(schema: any): asserts schema is EventSchema {
  if (schema.type === undefined) {
    throw new EventConfigAssertionError("Missing required 'type' key");
  }
  if (schema.data) {
    try {
      new Ajv().addSchema({
        type: "object",
        properties: schema.data,
      });
    } catch (error) {
      throw new EventConfigAssertionError("Invalid 'data' provided, must be valid JSONSchema", error);
    }
  }
  if (schema.meta) {
    try {
      new Ajv().addSchema({
        type: "object",
        properties: schema.meta,
      });
    } catch (error) {
      throw new EventConfigAssertionError("Invalid 'meta' provided, must be valid JSONSchema", error);
    }
  }
}

export function assertDefinitionSchema(schema: any): asserts schema is DefinitionSchema {
  for (const key in schema) {
    try {
      new Ajv().addSchema(schema[key]);
    } catch (error) {
      throw new EventConfigAssertionError("Invalid 'definitions' provided, must be valid JSONSchema", error);
    }
  }
}

export type EventSchema = {
  type: string;
  data?: JSONSchemaProperties;
  meta?: JSONSchemaProperties;
};

export type DefinitionSchema = JSONSchemaProperties;

type JSONSchemaProperties = {
  [key: string]: JSONSchema4;
};
