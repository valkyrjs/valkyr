import { Ajv } from "ajv";
import type { JSONSchema4 } from "json-schema";

class EventConfigAssertionError extends Error {
  constructor(message: string, readonly error?: unknown) {
    super(`Config Assertion Error: ${message}`);
  }
}

export function assertConfigs(configs: any[]): asserts configs is Config[] {
  for (const config of configs) {
    assertConfig(config.event);
  }
}

export function assertConfig(config: any): asserts config is Config {
  if (config.event.type === undefined) {
    throw new EventConfigAssertionError("Missing required 'type' key");
  }
  if (config.event.data) {
    try {
      new Ajv().addSchema({
        type: "object",
        properties: config.event.data,
      });
    } catch (error) {
      throw new EventConfigAssertionError("Invalid 'data' provided, must be valid JSONSchema", error);
    }
  }
  if (config.event.meta) {
    try {
      new Ajv().addSchema({
        type: "object",
        properties: config.event.meta,
      });
    } catch (error) {
      throw new EventConfigAssertionError("Invalid 'meta' provided, must be valid JSONSchema", error);
    }
  }
}

export type Config = {
  event: {
    type: string;
    data?: JSONSchemaProperties;
    meta?: JSONSchemaProperties;
  };
};

type JSONSchemaProperties = {
  [key: string]: JSONSchema4;
};
