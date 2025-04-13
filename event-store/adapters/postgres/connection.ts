import type { Options, Sql } from "postgres";

export type PostgresConnection = [PostgresConnectionUrl, Options<any>?] | [Options<any>] | Sql | PostgresConnectionFactory;

type PostgresConnectionUrl = `postgres://${string}:${string}@${string}:${number}/${string}`;

type PostgresConnectionFactory = () => Sql;
