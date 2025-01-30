import type { Db, WithId } from "mongodb";
import type { AnyZodObject, z } from "zod";

/**
 * Take a list of records and run it through the given zod parser. This
 * ensures that all the documents in resulting list adheres to the
 * expected schematics before b eing returned. Any deviation in the list
 * will result in an internal error being thrown.
 *
 * @param parser - Zod parser to run the documents through.
 */
export function toParsedRecords<TSchema extends AnyZodObject>(parser: TSchema): (documents: WithId<object>[]) => z.infer<TSchema>[] {
  return parser.array().parse;
}

/**
 * Take a single nullable document value and run it through the given zod
 * parser. This ensures that the data adheres to the expected schematics
 * before being returned. Any deviation in the expected response will result
 * in an internal error being thrown.
 *
 * @param parser - Zod parser to run the document through.
 */
export function toParsedRecord<TSchema extends AnyZodObject>(parser: TSchema): (document: WithId<object> | null) => z.infer<TSchema> | undefined {
  return function (document: object | null) {
    if (document === null) {
      return undefined;
    }
    return parser.parse(document);
  };
}

/**
 * Get a Set of collections that exists on a given mongo database instance.
 *
 * @param db - Mongo database to fetch collection list for.
 */
export async function getCollectionsSet(db: Db) {
  return db
    .listCollections()
    .toArray()
    .then((collections) => new Set(collections.map((c) => c.name)));
}
