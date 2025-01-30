import type { CreateIndexesOptions, IndexSpecification } from "mongodb";

export type CollectionRegistrar = {
  name: string;
  indexes: [IndexSpecification, CreateIndexesOptions?][];
};
