import { Ajv, JSONSchemaType, Schema } from "ajv";

export async function resolveRefs<TSchema extends Schema | JSONSchemaType<unknown>>(schema: TSchema) {
  return makeAjv().compile(schema);
}

function makeAjv() {
  return new Ajv({ loadSchema: (uri) => fetch(uri).then((res) => res.json()) }).addKeyword("optional", {
    keyword: "optional",
    type: "object",
    validate: function (schema: any) {
      if (schema === true) {
        return true;
      }
      return false;
    },
    errors: false,
  });
}
