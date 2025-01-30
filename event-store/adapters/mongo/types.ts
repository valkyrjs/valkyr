import type { CreateIndexesOptions, Db, IndexSpecification, MongoClient } from "mongodb";

export type CollectionRegistrar = {
  name: string;
  indexes: [IndexSpecification, CreateIndexesOptions?][];
};

export type DatabaseAccessor = {
  db: Db;
  client: MongoClient;
};
