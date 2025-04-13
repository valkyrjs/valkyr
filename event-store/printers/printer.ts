import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import $RefParser from "@apidevtools/json-schema-ref-parser";
import { ensureFile } from "@std/fs";
import { toCamelCase, toPascalCase } from "@std/text";
import { jsonSchemaToZod } from "json-schema-to-zod";
import { format } from "prettier";

import { assertDefinitionSchema, assertEventSchema, DefinitionSchema, EventSchema } from "./asserts/events.ts";
import { getDefinitions, getEventType } from "./types.ts";
import { jsonSchema } from "./utilities/json-schema.ts";

/**
 * Consumes a list of *.json files stored under given inputs and generates new
 * events files ready for consumption by an event store instance.
 *
 * @param options.inputs  - Folders containing *.json event configuration files.
 * @param options.outputs - List of outputs to print the event files to.
 *
 * @example
 *
 * ```ts
 * import { printEvents } from "@valkyr/event-store";
 *
 * await printEvents({
 *   inputs: [
 *    "path/to/events-1",
 *    "path/to/events-2"
 *   ],
 *   outputs: [
 *    "path/to/events.ts"
 *   ],
 * });
 * ```
 */
export async function printEvents({ inputs, outputs }: Options) {
  const { names, types, validators, definitions } = await getEventStoreContainer(inputs);
  const content = new TextEncoder().encode(
    await format(
      `
      // This is an auto generated file. Do not modify this file!
      // deno-fmt-ignore-file
      
      import { type Empty, type Event as TEvent, type EventToRecord } from "@valkyr/event-store";
      import { type AnyZodObject, z, type ZodUnion } from "zod";
  
      export const events = new Set([${names.sort().map((event) => `"${event}"`).join(",")}] as const);

      export const validators = {
        data: new Map<Event["type"], AnyZodObject | ZodUnion<any>>([
          ${Array.from(validators.data.entries()).sort(([a], [b]) => a > b ? 1 : -1).map(([key, value]) => `["${key}", ${value}]`).join(",")}
        ]),
        meta: new Map<Event["type"], AnyZodObject>([
          ${Array.from(validators.meta.entries()).sort(([a], [b]) => a > b ? 1 : -1).map(([key, value]) => `["${key}", ${value}]`).join(",")}
        ]),
      }

      export type EventRecord = EventToRecord<Event>;

      export type Event = ${names.sort().map((name) => toPascalCase(name)).join(" | ")};

      // ### Events
      // Event definitions for all available event types.

      ${types.sort().join("\n\n")}

      // ### Definitions
      // List of all shared schema definitions.

      ${Array.from(validators.defs.entries()).map(([key, value]) => `export const ${key} = ${value};`).join("\n\n")}

      ${definitions.join("\n\n")}
    `,
      {
        parser: "typescript",
        printWidth: 120,
      },
    ),
  );
  for (const output of outputs) {
    await ensureFile(output);
    await Deno.writeFile(
      output,
      content,
      {
        create: true,
      },
    );
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function getEventStoreContainer(inputs: string[]): Promise<EventStoreContainer> {
  const container: EventStoreContainer = {
    names: [],
    types: [],
    props: new Set(),
    validators: {
      defs: new Map<string, any>(),
      data: new Map<string, any>(),
      meta: new Map<string, any>(),
    },
    definitions: [],
    imports: [],
  };

  const defs = new Map<string, any>();
  for (const definitions of await getLocalDefinitions(inputs)) {
    for (const key in definitions) {
      if (defs.has(key)) {
        throw new Error(`Config Duplicate Definition Error: Key '${key}' is already defined`);
      }
      defs.set(key, definitions[key]);
    }
  }

  const definitions = defs.entries().reduce((defs, [key, schema]) => {
    defs[key] = populateSchema(schema);
    return defs;
  }, {} as any);

  for (const [key, schema] of defs.entries()) {
    container.validators.defs.set(toCamelCase(key), await toZodDefinition(key, schema, definitions));
  }

  container.definitions = getDefinitions(defs);

  for (const event of await getLocalEvents(inputs)) {
    const type = event.type;
    container.names.push(type);
    container.types.push(getEventType(event));
    if (event.data !== undefined) {
      container.props.add({ name: type, props: jsonSchema.propertyNames(event.data) });
      container.validators.data.set(type, await toZodValidation(type, event.data, definitions));
    }
    if (event.meta !== undefined) {
      container.validators.meta.set(type, await toZodValidation(type, event.meta, definitions));
    }
  }

  return container;
}

async function getLocalEvents(paths: string[], events: EventSchema[] = []): Promise<EventSchema[]> {
  for (const path of paths) {
    for (const entity of await readdir(path, { withFileTypes: true })) {
      if (entity.isDirectory()) {
        await resolveLocalEvents(join(path, entity.name), events);
      }
      if (entity.isFile() === true && entity.name.endsWith(".json") && entity.name !== "$definitions.json") {
        const schema = JSON.parse(new TextDecoder().decode(await readFile(join(path, entity.name))));
        assertEventSchema(schema);
        events.push(schema);
      }
    }
  }
  return events;
}

async function resolveLocalEvents(path: string, events: EventSchema[]) {
  for (const entity of await readdir(path, { withFileTypes: true })) {
    if (entity.isDirectory()) {
      await resolveLocalEvents(join(path, entity.name), events);
    }
    if (entity.isFile() === true && entity.name.endsWith(".json") && entity.name !== "$definitions.json") {
      const schema = JSON.parse(new TextDecoder().decode(await readFile(join(path, entity.name))));
      assertEventSchema(schema);
      events.push(schema);
    }
  }
}

async function getLocalDefinitions(paths: string[], definitions: DefinitionSchema[] = []): Promise<DefinitionSchema[]> {
  for (const path of paths) {
    for (const entity of await readdir(path, { withFileTypes: true })) {
      if (entity.isDirectory()) {
        await resolveLocalDefinitions(join(path, entity.name), definitions);
      }
      if (entity.isFile() === true && entity.name === "$definitions.json") {
        const schema = JSON.parse(new TextDecoder().decode(await readFile(join(path, entity.name))));
        assertDefinitionSchema(schema);
        definitions.push(schema);
      }
    }
  }
  return definitions;
}

async function resolveLocalDefinitions(path: string, definitions: DefinitionSchema[]) {
  for (const entity of await readdir(path, { withFileTypes: true })) {
    if (entity.isDirectory()) {
      await resolveLocalDefinitions(join(path, entity.name), definitions);
    }
    if (entity.isFile() === true && entity.name === "$definitions.json") {
      const schema = JSON.parse(new TextDecoder().decode(await readFile(join(path, entity.name))));
      assertDefinitionSchema(schema);
      definitions.push(schema);
    }
  }
}

async function toZodDefinition(name: string, data: any, definitions: any) {
  return jsonSchemaToZod(
    await $RefParser.dereference({
      $schema: "http://json-schema.org/draft-04/schema#",
      id: `valkyrjs/schemas/v1/${name}.json`,
      title: name,
      definitions,
      ...populateSchema(data),
    }),
  );
}

async function toZodValidation(name: string, data: any, definitions: any) {
  const schema: any = {
    $schema: "http://json-schema.org/draft-04/schema#",
    id: `valkyrjs/schemas/v1/${name}.json`,
    title: name,
    definitions,
    additionalProperties: false,
  };

  if (data.anyOf !== undefined) {
    schema.anyOf = toMappedAnyOf(data.anyOf);
  } else {
    schema.type = "object";
    schema.properties = populateProperties(data);
    schema.required = getRequiredKeys(data);
  }

  return jsonSchemaToZod(await $RefParser.dereference(schema));
}

function populateProperties(props: any) {
  for (const key in props) {
    populateSchema(props[key]);
  }
  return props;
}

function populateSchema(schema: any): any {
  if (schema.anyOf !== undefined) {
    schema.anyOf = toMappedAnyOf(schema.anyOf);
  }
  if (schema.type === "object") {
    schema.properties = populateProperties(schema.properties);
    schema.required = getRequiredKeys(schema.properties);
    schema.additionalProperties = schema.additionalProperties === true;
  }
  return schema;
}

function toMappedAnyOf(schemas: any[]): any[] {
  return schemas.map((schema: any) => {
    if (schema.type === "object") {
      schema.properties = populateProperties(schema.properties);
      schema.required = getRequiredKeys(schema.properties);
      schema.additionalProperties = false;
    }
    return schema;
  });
}

function getRequiredKeys(props: any): string[] {
  const required: string[] = [];
  for (const key of Object.keys(props)) {
    const config = props[key];
    if (config.optional !== true) {
      required.push(key);
    }
  }
  return required;
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

/**
 * Options bag to pass to the {@link printEvents} method.
 */
type Options = {
  /**
   * Absolute paths to the folders the event configuration files is stored.
   *
   * @example
   *
   * ```ts
   * await printEvents({
   *   paths: ["path/to/events-1", "path/to/events-2"]
   *   outputs: ["path/to/events.ts"],
   *   modules: []
   * });
   * ```
   */
  inputs: string[];

  /**
   * Absolute path to the folder the generated events should be written.
   *
   * @example
   *
   * ```ts
   * await printEvents({
   *   paths: ["path/to/events-1", "path/to/events-2"]
   *   outputs: ["path/to/events.ts"],
   *   modules: []
   * });
   * ```
   */
  outputs: string[];
};

type EventStoreContainer = {
  names: string[];
  types: string[];
  props: Set<{ name: string; props: string[] }>;
  validators: {
    defs: Map<string, any>;
    data: Map<string, any>;
    meta: Map<string, any>;
  };
  definitions: string[];
  imports: string[];
};
